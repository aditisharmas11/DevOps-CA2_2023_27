"""
DFREC: DeepFake Identity Recovery Based on Identity-aware Masked Autoencoder
Reference: arXiv:2412.07260v2, Mar 2025
Authors: Peipeng Yu, Hui Gao, Jianwei Fei, Zhitao Huang, Zhihua Xia, Chip-Hong Chang

This module implements the core architecture of DFREC, focusing on identity-preserving
face reconstruction from DeepFake images using Masked Autoencoders.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

class IdentityAwareMasking(nn.Module):
    def __init__(self, patch_size=16, threshold=0.3):
        super().__init__()
        self.patch_size = patch_size
        self.threshold = threshold

    def forward(self, image, mask):
        """
        image: (B, C, H, W) - Input image (standard 224x224)
        mask: (B, 1, H, W) - Segmentation map from Module 1 (1 for fake, 0 for real)
        """
        B, C, H, W = image.shape
        P = self.patch_size
        num_patches_h = H // P
        num_patches_w = W // P
        num_patches = num_patches_h * num_patches_w

        # 1. Image Patching
        # Reshape image into patches: (B, num_patches, P*P*C)
        patches = image.unfold(2, P, P).unfold(3, P, P) # (B, C, num_patches_h, num_patches_w, P, P)
        patches = patches.permute(0, 2, 3, 1, 4, 5).contiguous() # (B, num_patches_h, num_patches_w, C, P, P)
        patches = patches.view(B, num_patches, -1) # (B, num_patches, C*P*P)

        # 2. Mapping the Mask
        # Reshape mask into patches and calculate percentage of fake pixels
        mask_patches = mask.unfold(2, P, P).unfold(3, P, P) # (B, 1, num_patches_h, num_patches_w, P, P)
        mask_patches = mask_patches.permute(0, 2, 3, 1, 4, 5).contiguous()
        mask_patches = mask_patches.view(B, num_patches, -1) # (B, num_patches, P*P)
        
        # Calculate mean of mask in each patch (percentage of fake pixels)
        patch_fake_ratio = mask_patches.mean(dim=-1) # (B, num_patches)
        
        # Mark patches for masking if ratio > threshold
        mask_indices = patch_fake_ratio > self.threshold # (B, num_patches) bool tensor

        # 3. Applying the Mask
        # We need to separate unmasked (authentic) and masked (manipulated) patches
        # For MAE, we only keep the unmasked patches for the encoder
        
        all_unmasked_patches = []
        all_kept_indices = []
        
        for i in range(B):
            # Get indices of unmasked patches for this image
            kept_idx = torch.where(~mask_indices[i])[0]
            all_kept_indices.append(kept_idx)
            
            # Keep only authentic patches
            unmasked_patches = patches[i, kept_idx]
            all_unmasked_patches.append(unmasked_patches)

        return all_unmasked_patches, all_kept_indices, mask_indices, num_patches

class PatchEmbedding(nn.Module):
    def __init__(self, patch_size=16, in_chans=3, embed_dim=768):
        super().__init__()
        self.patch_size = patch_size
        self.proj = nn.Linear(patch_size * patch_size * in_chans, embed_dim)

    def forward(self, x):
        if isinstance(x, list):
            embeddings = [self.proj(patch) for patch in x]
        else:
            embeddings = self.proj(x)
        return embeddings

def get_2d_sincos_pos_embed(embed_dim, grid_size, cls_token=False):
    """
    grid_size: int of the grid height and width
    return:
    pos_embed: [grid_size*grid_size, embed_dim] or [1+grid_size*grid_size, embed_dim] (w/ or w/o cls_token)
    """
    grid_h = np.arange(grid_size, dtype=np.float32)
    grid_w = np.arange(grid_size, dtype=np.float32)
    grid = np.meshgrid(grid_w, grid_h)  # here w goes first
    grid = np.stack(grid, axis=0)

    grid = grid.reshape([2, 1, grid_size, grid_size])
    pos_embed = get_2d_sincos_pos_embed_from_grid(embed_dim, grid)
    if cls_token:
        pos_embed = np.concatenate([np.zeros([1, embed_dim]), pos_embed], axis=0)
    return pos_embed

def get_2d_sincos_pos_embed_from_grid(embed_dim, grid):
    assert embed_dim % 2 == 0

    # use half of dimensions to encode grid_h
    emb_h = get_1d_sincos_pos_embed_from_grid(embed_dim // 2, grid[0])  # (H*W, D/2)
    emb_w = get_1d_sincos_pos_embed_from_grid(embed_dim // 2, grid[1])  # (H*W, D/2)

    pos_embed = np.concatenate([emb_h, emb_w], axis=1) # (H*W, D)
    return pos_embed

def get_1d_sincos_pos_embed_from_grid(embed_dim, grid):
    assert embed_dim % 2 == 0
    omega = np.arange(embed_dim // 2, dtype=np.float32)
    omega /= embed_dim / 2.
    omega = 1. / 10000**omega  # (D/2,)

    grid = grid.flatten()  # (M,)
    out = np.outer(grid, omega)  # (M, D/2)

    emb_sin = np.sin(out) # (M, D/2)
    emb_cos = np.cos(out) # (M, D/2)

    emb = np.concatenate([emb_sin, emb_cos], axis=1)  # (M, D)
    return emb

class MAEFaceReconstruction(nn.Module):
    def __init__(self, img_size=224, patch_size=16, in_chans=3, 
                 embed_dim=768, depth=12, num_heads=12,
                 decoder_embed_dim=512, decoder_depth=8, decoder_num_heads=16,
                 mlp_ratio=4., norm_layer=nn.LayerNorm):
        super().__init__()
        
        self.patch_size = patch_size
        self.num_patches = (img_size // patch_size) ** 2
        
        # Module 2
        self.masking = IdentityAwareMasking(patch_size=patch_size)
        self.patch_embed = PatchEmbedding(patch_size=patch_size, in_chans=in_chans, embed_dim=embed_dim)
        
        # Positional Embedding
        self.pos_embed = nn.Parameter(torch.zeros(1, self.num_patches, embed_dim), requires_grad=False)
        self.decoder_pos_embed = nn.Parameter(torch.zeros(1, self.num_patches, decoder_embed_dim), requires_grad=False)
        
        # Module 3
        self.encoder = SIRMEncoder(embed_dim=embed_dim, depth=depth, num_heads=num_heads, mlp_ratio=mlp_ratio)
        
        # Module 4
        self.decoder = TIRMDecoder(num_patches=self.num_patches, embed_dim=embed_dim, 
                                  decoder_embed_dim=decoder_embed_dim, depth=decoder_depth, 
                                  num_heads=decoder_num_heads, mlp_ratio=mlp_ratio, patch_size=patch_size)
        
        self.initialize_weights()

    def initialize_weights(self):
        # Positional embedding initialization
        pos_embed = get_2d_sincos_pos_embed(self.pos_embed.shape[-1], int(self.num_patches**.5), cls_token=False)
        self.pos_embed.data.copy_(torch.from_numpy(pos_embed).float().unsqueeze(0))

        decoder_pos_embed = get_2d_sincos_pos_embed(self.decoder_pos_embed.shape[-1], int(self.num_patches**.5), cls_token=False)
        self.decoder_pos_embed.data.copy_(torch.from_numpy(decoder_pos_embed).float().unsqueeze(0))

        # Initialize patch_embed like nn.Linear (instead of nn.Conv2d)
        w = self.patch_embed.proj.weight.data
        torch.nn.init.xavier_uniform_(w.view([w.shape[0], -1]))

        # Timms's weight initialization
        self.apply(self._init_weights)

    def _init_weights(self, m):
        if isinstance(m, nn.Linear):
            torch.nn.init.xavier_uniform_(m.weight)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.constant_(m.bias, 0)
        elif isinstance(m, nn.LayerNorm):
            nn.init.constant_(m.bias, 0)
            nn.init.constant_(m.weight, 1.0)

    def forward(self, image, mask):
        # image: (B, 3, 224, 224), mask: (B, 1, 224, 224)
        # Normalize input to [-1, 1] if it's in [0, 1]
        if image.max() <= 1.0:
            image = (image * 2.0) - 1.0
            
        # 1. Module 2: Masking & Patching
        unmasked_patches_list, kept_indices_list, mask_indices, num_patches = self.masking(image, mask)
        
        all_reconstructed = []
        
        for i in range(len(unmasked_patches_list)):
            # Single image processing
            unmasked_patches = unmasked_patches_list[i].unsqueeze(0) # (1, N_unmasked, D_patch)
            kept_indices = kept_indices_list[i].unsqueeze(0) # (1, N_unmasked)
            
            # 2. Patch Embedding
            x = self.patch_embed(unmasked_patches) # (1, N_unmasked, D)
            
            # 3. Add Positional Embedding for unmasked patches
            pos_embed_unmasked = torch.gather(self.pos_embed, dim=1, index=kept_indices.unsqueeze(-1).repeat(1, 1, self.pos_embed.shape[-1]))
            
            # 4. Module 3: SIRM Encoder
            latent = self.encoder(x, pos_embed_unmasked)
            
            # 5. Module 4: TIRM Decoder
            full_indices = torch.arange(num_patches, device=image.device)
            mask_indices_i = torch.where(mask_indices[i])[0]
            
            ids_restore = torch.zeros(num_patches, dtype=torch.long, device=image.device)
            for p, idx in enumerate(kept_indices[0]):
                ids_restore[idx] = p
            for q, idx in enumerate(mask_indices_i):
                ids_restore[idx] = len(kept_indices[0]) + q
            
            ids_restore = ids_restore.unsqueeze(0) # (1, N_full)
            
            reconstructed_patches = self.decoder(latent, ids_restore, self.decoder_pos_embed)
            all_reconstructed.append(reconstructed_patches)
            
        results = []
        for rec in all_reconstructed:
            # rec: (1, 196, 768)
            p = self.patch_size
            h = w = int(rec.shape[1]**.5)
            rec = rec.reshape(1, h, w, p, p, 3)
            rec = torch.einsum('nhwpqc->nchpwq', rec)
            rec = rec.reshape(1, 3, h * p, w * p)
            
            # Denormalize from [-1, 1] to [0, 1]
            rec = (rec + 1.0) / 2.0
            rec = torch.clamp(rec, 0, 1)
            results.append(rec)
            
        return torch.cat(results, dim=0)

    def load_weights(self, path):
        """Load pre-trained weights from a .pth file with robust mapping."""
        try:
            state_dict = torch.load(path, map_location='cpu')
            if 'model' in state_dict:
                state_dict = state_dict['model']
            elif 'state_dict' in state_dict:
                state_dict = state_dict['state_dict']
            
            new_state_dict = {}
            curr_state_dict = self.state_dict()
            
            for k, v in state_dict.items():
                if k.startswith('module.'):
                    k = k[len('module.'):]
                if k.startswith('model.'):
                    k = k[len('model.'):]

                candidate_keys = [k]
                if not k.startswith('encoder.') and (k.startswith('blocks.') or k.startswith('norm.') or k.startswith('patch_embed.')):
                    candidate_keys.append('encoder.' + k)
                if not k.startswith('decoder.') and (k.startswith('decoder_blocks.') or k.startswith('decoder_norm.') or k.startswith('decoder_pred.') or k.startswith('decoder_embed.') or k.startswith('mask_token')):
                    candidate_keys.append('decoder.' + k)

                mapped_key = None
                for ck in candidate_keys:
                    if ck in curr_state_dict:
                        mapped_key = ck
                        break
                if mapped_key is None:
                    continue

                k = mapped_key

                # 1. Handle Positional Embeddings (skip CLS token if present)
                if 'pos_embed' in k:
                    if v.shape[1] == self.num_patches + 1:
                        print(f"Adapting {k}: removing CLS token position.")
                        v = v[:, 1:, :]
                    elif v.shape[1] != self.num_patches:
                        print(f"Skipping {k}: shape mismatch {v.shape} vs {curr_state_dict[k].shape}")
                        continue
                
                # 2. Handle Patch Embedding (Conv2d to Linear)
                if 'patch_embed.proj.weight' in k:
                    if len(v.shape) == 4: # Conv2d: [out, in, h, w]
                        print(f"Adapting {k}: reshaping Conv2d weights to Linear.")
                        v = v.reshape(v.shape[0], -1)
                
                # 3. Direct mapping or simple name changes
                if k in curr_state_dict:
                    if v.shape == curr_state_dict[k].shape:
                        new_state_dict[k] = v
                    else:
                        print(f"Skipping {k}: shape mismatch {v.shape} vs {curr_state_dict[k].shape}")
                else:
                    # Try some common name mappings if needed
                    pass
            
            # Check if custom refinement layers are present
            has_cbam = any('cbam' in k for k in new_state_dict.keys())
            has_roa = any('roa' in k for k in new_state_dict.keys())
            
            if has_cbam and has_roa:
                self.decoder.use_refinement = True
                print("Custom refinement layers (CBAM, ROA) found and enabled.")
            else:
                self.decoder.use_refinement = False
                print("Custom refinement layers not found in weights. Disabling them to avoid noise.")

            msg = self.load_state_dict(new_state_dict, strict=False)
            print(f"Successfully loaded weights from {path}")
            print(f"Load message: {msg}")
            return True
        except Exception as e:
            print(f"Failed to load weights: {e}")
            import traceback
            traceback.print_exc()
            return False

class IdentityLoss(nn.Module):
    def __init__(self, feature_extractor=None, use_pretrained=False):
        super().__init__()
        if feature_extractor is None:
            if use_pretrained:
                try:
                    from torchvision.models import resnet50, ResNet50_Weights
                    model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V1)
                    self.feature_extractor = nn.Sequential(*list(model.children())[:-1]) 
                    print("IdentityLoss: Using pre-trained ResNet50.")
                except Exception as e:
                    print(f"IdentityLoss: Could not load pre-trained ResNet50 ({e}). Falling back.")
                    from torchvision.models import resnet50
                    model = resnet50(weights=None)
                    self.feature_extractor = nn.Sequential(*list(model.children())[:-1])
            else:
                from torchvision.models import resnet50
                model = resnet50(weights=None)
                self.feature_extractor = nn.Sequential(*list(model.children())[:-1])
                print("IdentityLoss: Using random initialization (weights=None).")
        else:
            self.feature_extractor = feature_extractor
        
        self.feature_extractor.eval()
        for param in self.feature_extractor.parameters():
            param.requires_grad = False

    def forward(self, reconstructed, target):
        # Ensure input is 4D
        if reconstructed.dim() == 3:
            reconstructed = reconstructed.unsqueeze(0)
        if target.dim() == 3:
            target = target.unsqueeze(0)
            
        rec_feat = self.feature_extractor(reconstructed)
        target_feat = self.feature_extractor(target)
        
        # Flatten to (B, C)
        rec_feat = torch.flatten(rec_feat, 1)
        target_feat = torch.flatten(target_feat, 1)
        
        return F.mse_loss(rec_feat, target_feat)

class Attention(nn.Module):
    def __init__(self, dim, num_heads=8, qkv_bias=False, attn_drop=0., proj_drop=0.):
        super().__init__()
        self.num_heads = num_heads
        head_dim = dim // num_heads
        self.scale = head_dim ** -0.5

        self.qkv = nn.Linear(dim, dim * 3, bias=qkv_bias)
        self.attn_drop = nn.Dropout(attn_drop)
        self.proj = nn.Linear(dim, dim)
        self.proj_drop = nn.Dropout(proj_drop)

    def forward(self, x):
        B, N, C = x.shape
        qkv = self.qkv(x).reshape(B, N, 3, self.num_heads, C // self.num_heads).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        attn = (q @ k.transpose(-2, -1)) * self.scale
        attn = attn.softmax(dim=-1)
        attn = self.attn_drop(attn)

        x = (attn @ v).transpose(1, 2).reshape(B, N, C)
        x = self.proj(x)
        x = self.proj_drop(x)
        return x

class MLP(nn.Module):
    def __init__(self, in_features, hidden_features=None, out_features=None, act_layer=nn.GELU, drop=0.):
        super().__init__()
        out_features = out_features or in_features
        hidden_features = hidden_features or in_features
        self.fc1 = nn.Linear(in_features, hidden_features)
        self.act = act_layer()
        self.fc2 = nn.Linear(hidden_features, out_features)
        self.drop = nn.Dropout(drop)

    def forward(self, x):
        x = self.fc1(x)
        x = self.act(x)
        x = self.drop(x)
        x = self.fc2(x)
        x = self.drop(x)
        return x

class Block(nn.Module):
    def __init__(self, dim, num_heads, mlp_ratio=4., qkv_bias=False, drop=0., attn_drop=0.):
        super().__init__()
        self.norm1 = nn.LayerNorm(dim)
        self.attn = Attention(dim, num_heads=num_heads, qkv_bias=qkv_bias, attn_drop=attn_drop, proj_drop=drop)
        self.norm2 = nn.LayerNorm(dim)
        self.mlp = MLP(in_features=dim, hidden_features=int(dim * mlp_ratio), act_layer=nn.GELU, drop=drop)

    def forward(self, x):
        x = x + self.attn(self.norm1(x))
        x = x + self.mlp(self.norm2(x))
        return x

class SIRMEncoder(nn.Module):
    def __init__(self, embed_dim=768, depth=12, num_heads=12, mlp_ratio=4., qkv_bias=True):
        super().__init__()
        self.blocks = nn.ModuleList([
            Block(embed_dim, num_heads, mlp_ratio, qkv_bias=qkv_bias)
            for i in range(depth)
        ])
        self.norm = nn.LayerNorm(embed_dim)

    def forward(self, x, pos_embed):
        # x: (B, N_unmasked, D)
        # pos_embed: (B, N_unmasked, D)
        x = x + pos_embed
        
        for block in self.blocks:
            x = block(x)
        
        x = self.norm(x)
        return x

class TIRMDecoder(nn.Module):
    def __init__(self, num_patches, embed_dim=768, decoder_embed_dim=512, depth=8, num_heads=16, mlp_ratio=4., qkv_bias=True, patch_size=16):
        super().__init__()
        self.num_patches = num_patches
        self.patch_size = patch_size
        
        self.decoder_embed = nn.Linear(embed_dim, decoder_embed_dim, bias=True)
        self.mask_token = nn.Parameter(torch.zeros(1, 1, decoder_embed_dim))
        
        self.decoder_blocks = nn.ModuleList([
            Block(decoder_embed_dim, num_heads, mlp_ratio, qkv_bias=qkv_bias)
            for i in range(depth)
        ])
        
        self.decoder_norm = nn.LayerNorm(decoder_embed_dim)
        
        # Integration of Attention Modules (FRG2D inspired)
        self.cbam = CBAM(decoder_embed_dim)
        self.roa = ResidualOutlookAttention(decoder_embed_dim)
        self.use_refinement = False # Default to False, enable only if weights loaded
        
        self.decoder_pred = nn.Linear(decoder_embed_dim, patch_size**2 * 3, bias=True) # predict RGB pixels

    def forward(self, x, ids_restore, pos_embed_full):
        # x: (B, N_unmasked, D) - Encoded patches
        # ids_restore: (B, N_full) - Indices to restore the full sequence
        # pos_embed_full: (B, N_full, D_decoder) - Positional embeddings for all patches
        
        # 1. Project to decoder dimension
        x = self.decoder_embed(x)

        # 2. Reintroduce [MASK] tokens
        # Append mask tokens to the end
        mask_tokens = self.mask_token.repeat(x.shape[0], ids_restore.shape[1] - x.shape[1], 1)
        x_all = torch.cat([x, mask_tokens], dim=1) # (B, N_full, D_decoder)
        
        # Unshuffle to original order
        x_all = torch.gather(x_all, dim=1, index=ids_restore.unsqueeze(-1).repeat(1, 1, x.shape[2]))

        # 3. Add full positional embeddings
        x_all = x_all + pos_embed_full

        # 4. Decoder processing with Attention Refinement
        for block in self.decoder_blocks:
            x_all = block(x_all)
            
        # Apply Attention Modules (Inspired by FRG2D) only if refinement is enabled
        if self.use_refinement:
            x_all = self.cbam(x_all)
            x_all = self.roa(x_all)
        
        x_all = self.decoder_norm(x_all)

        # 5. Pixel Reconstruction
        x_all = self.decoder_pred(x_all)
        
        return x_all

# --- FRG2D Inspired Attention Modules ---

class CBAM(nn.Module):
    """Convolutional Block Attention Module for Transformer tokens"""
    def __init__(self, dim, reduction=16):
        super().__init__()
        self.channel_gate = ChannelAttention(dim, reduction)
        self.spatial_gate = SpatialAttention()

    def forward(self, x):
        # x: (B, N, C)
        # Reshape to (B, C, H, W) for spatial/channel attention
        B, N, C = x.shape
        H = W = int(N**0.5)
        x_reshaped = x.transpose(1, 2).reshape(B, C, H, W)
        
        out = self.channel_gate(x_reshaped)
        out = self.spatial_gate(out)
        
        # Back to (B, N, C)
        return out.reshape(B, C, N).transpose(1, 2)

class ChannelAttention(nn.Module):
    def __init__(self, in_planes, reduction=16):
        super().__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
           
        self.fc = nn.Sequential(
            nn.Conv2d(in_planes, in_planes // reduction, 1, bias=False),
            nn.ReLU(),
            nn.Conv2d(in_planes // reduction, in_planes, 1, bias=False)
        )
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = self.fc(self.avg_pool(x))
        max_out = self.fc(self.max_pool(x))
        out = avg_out + max_out
        return x * self.sigmoid(out)

class SpatialAttention(nn.Module):
    def __init__(self, kernel_size=7):
        super().__init__()
        self.conv1 = nn.Conv2d(2, 1, kernel_size, padding=kernel_size//2, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = torch.mean(x, dim=1, keepdim=True)
        max_out, _ = torch.max(x, dim=1, keepdim=True)
        out = torch.cat([avg_out, max_out], dim=1)
        out = self.conv1(out)
        return x * self.sigmoid(out)

class ResidualOutlookAttention(nn.Module):
    """
    Simplified Residual Outlook Attention (ROA)
    Inspired by: FRG2D (Shi et al., 2025)
    Focuses on refining features in potentially manipulated regions.
    """
    def __init__(self, dim, num_heads=8, window_size=3):
        super().__init__()
        self.dim = dim
        self.num_heads = num_heads
        self.window_size = window_size
        
        self.v_proj = nn.Linear(dim, dim)
        self.attn_proj = nn.Linear(dim, num_heads * window_size * window_size)
        self.proj = nn.Linear(dim, dim)

    def forward(self, x):
        B, N, C = x.shape
        H = W = int(N**0.5)
        
        shortcut = x
        
        # Outlook Attention Logic
        v = self.v_proj(x).reshape(B, H, W, C)
        attn = self.attn_proj(x).reshape(B, H, W, self.num_heads, self.window_size**2)
        attn = attn.softmax(dim=-1)
        
        # Local window aggregation (simplified version of outlook attention)
        # We use unfold to get local patches
        v_padded = F.pad(v.permute(0, 3, 1, 2), (1, 1, 1, 1)) # (B, C, H+2, W+2)
        v_patches = F.unfold(v_padded, kernel_size=self.window_size).reshape(B, C, self.window_size**2, H, W)
        v_patches = v_patches.permute(0, 3, 4, 1, 2).reshape(B, H, W, self.num_heads, C // self.num_heads, self.window_size**2)
        
        # Weighted sum: (B, H, W, num_heads, C/num_heads)
        out = torch.einsum('bhwnk,bhwnck->bhwnc', attn, v_patches)
        out = out.reshape(B, N, C)
        
        out = self.proj(out)
        return shortcut + out
