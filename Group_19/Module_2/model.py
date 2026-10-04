import torch
import torch.nn as nn

import config


class MediTwinSymptomClassifier(
    nn.Module
):

    """
    Module 2 baseline:

        DDXPlus evidence
              +
        age
              +
        sex
              ↓
        49 pathology classes

    Architecture:

        Token Embedding
             ↓
        Transformer Encoder
             ↓
           [CLS]
             +
          Age MLP
             +
        Sex Embedding
             ↓
           Fusion
             ↓
        49-class classifier
    """

    def __init__(
        self,
        vocab_size: int = config.VOCAB_SIZE,
        num_classes: int = config.NUM_CLASSES,
        sequence_length: int = config.SEQUENCE_LENGTH,
        embed_dim: int = config.EMBED_DIM,
        num_layers: int = config.NUM_TRANSFORMER_LAYERS,
        num_heads: int = config.NUM_ATTENTION_HEADS,
        ff_dim: int = config.FF_DIM,
        dropout: float = config.DROPOUT,
        sex_embed_dim: int = config.SEX_EMBED_DIM,
        age_hidden_dim: int = config.AGE_HIDDEN_DIM,
    ):
        super().__init__()

        self.sequence_length = sequence_length

        # ----------------------------------------------------
        # Token embedding
        # ----------------------------------------------------

        self.token_embedding = nn.Embedding(
            num_embeddings=vocab_size,
            embedding_dim=embed_dim,
            padding_idx=0,
        )

        # ----------------------------------------------------
        # Positional embedding
        # ----------------------------------------------------

        self.position_embedding = nn.Embedding(
            num_embeddings=sequence_length,
            embedding_dim=embed_dim,
        )

        # ----------------------------------------------------
        # Transformer
        # ----------------------------------------------------

        encoder_layer = (
            nn.TransformerEncoderLayer(
                d_model=embed_dim,
                nhead=num_heads,
                dim_feedforward=ff_dim,
                dropout=dropout,
                activation="gelu",
                batch_first=True,
                norm_first=True,
            )
        )

        self.transformer = (
            nn.TransformerEncoder(
                encoder_layer,
                num_layers=num_layers,
            )
        )

        self.transformer_norm = nn.LayerNorm(
            embed_dim
        )

        self.dropout = nn.Dropout(
            dropout
        )

        # ----------------------------------------------------
        # Age branch
        # ----------------------------------------------------

        self.age_network = nn.Sequential(
            nn.Linear(1, age_hidden_dim),
            nn.GELU(),
            nn.LayerNorm(age_hidden_dim),
            nn.Dropout(dropout),
        )

        # ----------------------------------------------------
        # Sex branch
        # ----------------------------------------------------

        self.sex_embedding = nn.Embedding(
            num_embeddings=3,
            embedding_dim=sex_embed_dim,
        )

        # ----------------------------------------------------
        # Fusion
        # ----------------------------------------------------

        fusion_dim = (
            embed_dim
            + age_hidden_dim
            + sex_embed_dim
        )

        self.fusion = nn.Sequential(
            nn.Linear(
                fusion_dim,
                embed_dim,
            ),
            nn.GELU(),
            nn.LayerNorm(embed_dim),
            nn.Dropout(dropout),
        )

        # ----------------------------------------------------
        # Classification head
        # ----------------------------------------------------

        self.classifier = nn.Linear(
            embed_dim,
            num_classes,
        )

        # ----------------------------------------------------
        # Initialize
        # ----------------------------------------------------

        self._initialize_weights()

    # ========================================================
    # WEIGHT INITIALIZATION
    # ========================================================

    def _initialize_weights(self):

        nn.init.normal_(
            self.token_embedding.weight,
            mean=0.0,
            std=0.02,
        )

        nn.init.normal_(
            self.position_embedding.weight,
            mean=0.0,
            std=0.02,
        )

        nn.init.normal_(
            self.sex_embedding.weight,
            mean=0.0,
            std=0.02,
        )

        nn.init.xavier_uniform_(
            self.classifier.weight
        )

        nn.init.zeros_(
            self.classifier.bias
        )

    # ========================================================
    # FORWARD
    # ========================================================

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        age: torch.Tensor,
        sex: torch.Tensor,
    ) -> torch.Tensor:

        batch_size, seq_len = (
            input_ids.shape
        )

        if seq_len > self.sequence_length:
            raise ValueError(
                f"Input sequence length {seq_len} "
                f"exceeds configured maximum "
                f"{self.sequence_length}"
            )

        # ----------------------------------------------------
        # Positions
        # ----------------------------------------------------

        positions = torch.arange(
            seq_len,
            device=input_ids.device,
        ).unsqueeze(0)

        positions = positions.expand(
            batch_size,
            seq_len,
        )

        # ----------------------------------------------------
        # Token + position embedding
        # ----------------------------------------------------

        x = (
            self.token_embedding(input_ids)
            +
            self.position_embedding(positions)
        )

        x = self.dropout(x)

        # ----------------------------------------------------
        # Padding mask
        #
        # Transformer expects:
        # True  = ignore/padding
        # False = valid
        # ----------------------------------------------------

        padding_mask = (
            attention_mask == 0
        )

        x = self.transformer(
            x,
            src_key_padding_mask=padding_mask,
        )

        x = self.transformer_norm(x)

        # ----------------------------------------------------
        # CLS representation
        # ----------------------------------------------------

        cls_representation = x[:, 0, :]

        # ----------------------------------------------------
        # Age
        # ----------------------------------------------------

        age = age.reshape(
            batch_size,
            1,
        )

        age_representation = (
            self.age_network(age)
        )

        # ----------------------------------------------------
        # Sex
        # ----------------------------------------------------

        sex_representation = (
            self.sex_embedding(sex)
        )

        # ----------------------------------------------------
        # Fuse
        # ----------------------------------------------------

        fused = torch.cat(
            [
                cls_representation,
                age_representation,
                sex_representation,
            ],
            dim=-1,
        )

        fused = self.fusion(
            fused
        )

        fused = self.dropout(
            fused
        )

        # ----------------------------------------------------
        # Pathology logits
        # ----------------------------------------------------

        logits = self.classifier(
            fused
        )

        return logits


# ============================================================
# MODEL SELF TEST
# ============================================================

if __name__ == "__main__":

    print("=" * 80)
    print("MODEL SELF TEST")
    print("=" * 80)

    batch_size = 4

    input_ids = torch.randint(
        low=0,
        high=config.VOCAB_SIZE,
        size=(
            batch_size,
            config.SEQUENCE_LENGTH,
        ),
    )

    attention_mask = torch.ones(
        batch_size,
        config.SEQUENCE_LENGTH,
        dtype=torch.long,
    )

    age = torch.randn(
        batch_size,
    )

    sex = torch.randint(
        low=0,
        high=3,
        size=(batch_size,),
    )

    model = MediTwinSymptomClassifier()

    logits = model(
        input_ids=input_ids,
        attention_mask=attention_mask,
        age=age,
        sex=sex,
    )

    print(
        f"Input shape : {tuple(input_ids.shape)}"
    )

    print(
        f"Logits shape: {tuple(logits.shape)}"
    )

    expected = (
        batch_size,
        config.NUM_CLASSES,
    )

    assert logits.shape == expected

    print()
    print("✓ Model self-test passed.")