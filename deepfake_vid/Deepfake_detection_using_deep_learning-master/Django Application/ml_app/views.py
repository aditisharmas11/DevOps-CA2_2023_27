from django.shortcuts import render, redirect
import torch
import torchvision
from torchvision import transforms, models
from torch.utils.data import DataLoader
from torch.utils.data.dataset import Dataset
import os
import numpy as np
import cv2
import matplotlib.pyplot as plt
import face_recognition
from torch.autograd import Variable
import time
import sys
from torch import nn
import json
import glob
import copy
import shutil
from PIL import Image as pImage
from django.conf import settings
from .forms import ImageUploadForm
from pathlib import Path
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

# Import MAE modules only when needed to avoid top-level import issues
def get_mae_modules():
    from reconstruction.mae_modules import MAEFaceReconstruction, IdentityLoss
    return MAEFaceReconstruction, IdentityLoss

index_template_name = 'index.html'
predict_template_name = 'predict.html'
about_template_name = "about.html"

im_size = 112
mean=[0.485, 0.456, 0.406]
std=[0.229, 0.224, 0.225]
sm = nn.Softmax()
inv_normalize =  transforms.Normalize(mean=-1*np.divide(mean,std),std=np.divide([1,1,1],std))
if torch.cuda.is_available():
    device = 'cuda'
else:
    device = 'cpu'

train_transforms = transforms.Compose([
                                        transforms.ToPILImage(),
                                        transforms.Resize((im_size,im_size)),
                                        transforms.ToTensor(),
                                        transforms.Normalize(mean,std)])

class Model(nn.Module):

    def __init__(self, num_classes,latent_dim= 2048, lstm_layers=1 , hidden_dim = 2048, bidirectional = False):
        super(Model, self).__init__()
        model = models.resnext50_32x4d(pretrained = True)
        self.model = nn.Sequential(*list(model.children())[:-2])
        self.lstm = nn.LSTM(latent_dim,hidden_dim, lstm_layers,  bidirectional)
        self.relu = nn.LeakyReLU()
        self.dp = nn.Dropout(0.4)
        self.linear1 = nn.Linear(2048,num_classes)
        self.avgpool = nn.AdaptiveAvgPool2d(1)

    def forward(self, x):
        batch_size,seq_length, c, h, w = x.shape
        x = x.view(batch_size * seq_length, c, h, w)
        fmap = self.model(x)
        x = self.avgpool(fmap)
        x = x.view(batch_size,seq_length,2048)
        x_lstm,_ = self.lstm(x,None)
        return fmap,self.dp(self.linear1(x_lstm[:,-1,:]))


class validation_dataset(Dataset):
    def __init__(self,image_paths,sequence_length=20,transform = None):
        self.image_paths = image_paths
        self.transform = transform
        self.count = sequence_length

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self,idx):
        image_path = self.image_paths[idx]
        frame = cv2.imread(image_path)
        # The model was trained on BGR images (from cv2)
        # and transform(frame) was called on BGR frames.
        # So we should NOT convert to RGB here before transform.
        
        # We need to return a sequence of frames for the model
        # For a single image, we repeat the same image 'count' times
        transformed_frame = self.transform(frame)
        frames = torch.stack([transformed_frame for _ in range(self.count)])
        return frames.unsqueeze(0)
    
    def frame_extract(self,path):
      vidObj = cv2.VideoCapture(path) 
      success = 1
      while success:
          success, image = vidObj.read()
          if success:
              yield image

def im_convert(tensor, video_file_name):
    """ Display a tensor as an image. """
    image = tensor.to("cpu").clone().detach()
    image = image.squeeze()
    image = inv_normalize(image)
    image = image.numpy()
    image = image.transpose(1,2,0)
    image = image.clip(0, 1)
    # This image is not used
    # cv2.imwrite(os.path.join(settings.PROJECT_DIR, 'uploaded_images', video_file_name+'_convert_2.png'),image*255)
    return image

def im_plot(tensor):
    image = tensor.cpu().numpy().transpose(1,2,0)
    b,g,r = cv2.split(image)
    image = cv2.merge((r,g,b))
    image = image*[0.22803, 0.22145, 0.216989] +  [0.43216, 0.394666, 0.37645]
    image = image*255.0
    plt.imshow(image.astype('uint8'))
    plt.show()


# Global lists to track evaluations for metrics
session_all_preds = []
session_all_labels = []

def print_evaluation_metrics(preds, labels):
    """ Prints comprehensive evaluation metrics. """
    if not preds or not labels or len(preds) != len(labels):
        return

    accuracy = accuracy_score(labels, preds)
    # Handle binary metrics safely
    try:
        precision = precision_score(labels, preds, zero_division=0)
        recall = recall_score(labels, preds, zero_division=0)
        f1 = f1_score(labels, preds, zero_division=0)
    except:
        precision = recall = f1 = 0.0

    cm = confusion_matrix(labels, preds, labels=[0, 1])
    # labels are [0, 1] -> [Fake, Real]
    # CM format:
    # [[TN, FP],
    #  [FN, TP]]
    tn, fp, fn, tp = cm.ravel()

    print("\n" + "="*40)
    print("      CUMULATIVE EVALUATION METRICS")
    print("="*40)
    print(f"Total Predictions: {len(labels)}")
    print("-" * 40)
    print(f"Accuracy:          {accuracy:.4f}")
    print(f"Precision:         {precision:.4f}")
    print(f"Recall:            {recall:.4f}")
    print(f"F1 Score:          {f1:.4f}")
    print("-" * 40)
    print(f"True Positives (Real):  {tp}")
    print(f"True Negatives (Fake):  {tn}")
    print(f"False Positives (Fake as Real): {fp}")
    print(f"False Negatives (Real as Fake): {fn}")
    print("="*40 + "\n")

def predict(model,img,path = './', video_file_name=""):
  fmap,logits = model(img.to(device))
  img = im_convert(img[:,-1,:,:,:], video_file_name)
  params = list(model.parameters())
  weight_softmax = model.linear1.weight.detach().cpu().numpy()
  logits = sm(logits)
  _,prediction = torch.max(logits,1)
  confidence = logits[:,int(prediction.item())].item()*100
  print('confidence of prediction:',logits[:,int(prediction.item())].item()*100)  

  # --- Evaluation Metric Logic ---
  # Attempt to extract ground truth from filename for metrics
  ground_truth = None
  if "real" in video_file_name.lower():
      ground_truth = 1
  elif "fake" in video_file_name.lower():
      ground_truth = 0
  
  if ground_truth is not None:
      session_all_preds.append(int(prediction.item()))
      session_all_labels.append(ground_truth)
      print(f"Ground Truth identified from filename: {'REAL' if ground_truth == 1 else 'FAKE'}")
      print_evaluation_metrics(session_all_preds, session_all_labels)
  
  return [int(prediction.item()),confidence]

def plot_heat_map(i, model, img, path = './', video_file_name=''):
  fmap,logits = model(img.to(device))
  params = list(model.parameters())
  weight_softmax = model.linear1.weight.detach().cpu().numpy()
  logits = sm(logits)
  _,prediction = torch.max(logits,1)
  idx = np.argmax(logits.detach().cpu().numpy())
  bz, nc, h, w = fmap.shape
  #out = np.dot(fmap[-1].detach().cpu().numpy().reshape((nc, h*w)).T,weight_softmax[idx,:].T)
  out = np.dot(fmap[i].detach().cpu().numpy().reshape((nc, h*w)).T,weight_softmax[idx,:].T)
  predict = out.reshape(h,w)
  predict = predict - np.min(predict)
  predict_img = predict / np.max(predict)
  predict_img = np.uint8(255*predict_img)
  out = cv2.resize(predict_img, (im_size,im_size))
  heatmap = cv2.applyColorMap(out, cv2.COLORMAP_JET)
  img = im_convert(img[:,-1,:,:,:], video_file_name)
  result = heatmap * 0.5 + img*0.8*255
  # Saving heatmap - Start
  heatmap_name = video_file_name+"_heatmap_"+str(i)+".png"
  image_name = os.path.join(settings.PROJECT_DIR, 'uploaded_images', heatmap_name)
  cv2.imwrite(image_name,result)
  # Saving heatmap - End
  result1 = heatmap * 0.5/255 + img*0.8
  r,g,b = cv2.split(result1)
  result1 = cv2.merge((r,g,b))
  return image_name

# Model Selection
def get_accurate_model(sequence_length):
    model_name = []
    sequence_model = []
    final_model = ""
    list_models = glob.glob(os.path.join(settings.PROJECT_DIR, "models", "*.pt"))

    for model_path in list_models:
        model_name.append(os.path.basename(model_path))

    for model_filename in model_name:
        try:
            seq = model_filename.split("_")[3]
            if int(seq) == sequence_length:
                sequence_model.append(model_filename)
        except IndexError:
            pass  # Handle cases where the filename format doesn't match expected

    if len(sequence_model) > 1:
        accuracy = []
        for filename in sequence_model:
            acc = filename.split("_")[1]
            accuracy.append(float(acc))  # Convert accuracy to float for proper comparison
        max_index = accuracy.index(max(accuracy))
        final_model = sequence_model[max_index]
    elif len(sequence_model) == 1:
        final_model = sequence_model[0]
    else:
        return None  # Return None if no model is found

    return final_model

ALLOWED_VIDEO_EXTENSIONS = set(['mp4','gif','webm','avi','3gp','wmv','flv','mkv'])

def allowed_video_file(filename):
    #print("filename" ,filename.rsplit('.',1)[1].lower())
    if (filename.rsplit('.',1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS):
        return True
    else: 
        return False
def index(request):
    if request.method == 'GET':
        image_upload_form = ImageUploadForm()
        if 'file_name' in request.session:
            del request.session['file_name']
        if 'preprocessed_images' in request.session:
            del request.session['preprocessed_images']
        if 'faces_cropped_images' in request.session:
            del request.session['faces_cropped_images']
        return render(request, index_template_name, {"form": image_upload_form})
    else:
        image_upload_form = ImageUploadForm(request.POST, request.FILES)
        if image_upload_form.is_valid():
            image_file = image_upload_form.cleaned_data['upload_image_file']
            image_file_ext = image_file.name.split('.')[-1]
            # We will use a fixed sequence length for images as the model expects a sequence
            sequence_length = 60
            
            saved_image_file = 'uploaded_file_'+str(int(time.time()))+"."+image_file_ext
            print(f"Saving image to: {os.path.join(settings.PROJECT_DIR, 'uploaded_images', saved_image_file)}")
            if settings.DEBUG:
                with open(os.path.join(settings.PROJECT_DIR, 'uploaded_images', saved_image_file), 'wb') as iFile:
                    shutil.copyfileobj(image_file, iFile)
                request.session['file_name'] = os.path.join(settings.PROJECT_DIR, 'uploaded_images', saved_image_file)
            else:
                # Production path adjustment
                with open(os.path.join(settings.PROJECT_DIR, 'uploaded_images', saved_image_file), 'wb') as iFile:
                    shutil.copyfileobj(image_file, iFile)
                request.session['file_name'] = os.path.join(settings.PROJECT_DIR, 'uploaded_images', saved_image_file)
            
            request.session['sequence_length'] = sequence_length
            return redirect('ml_app:predict')
        else:
            return render(request, index_template_name, {"form": image_upload_form})

def predict_page(request):
    # This view handles both processing (GET) and results display (GET via session)
    if request.method == "POST":
        return redirect('ml_app:home')
    
    if request.method == "GET":
        # Check if we have results in session
        if 'output' in request.session:
            context = {
                'preprocessed_images': request.session.get('preprocessed_images', []),
                'faces_cropped_images': request.session.get('faces_cropped_images', []),
                'reconstructed_image': request.session.get('reconstructed_image'),
                'heatmap_images': request.session.get('heatmap_images', []),
                'output': request.session.get('output'),
                'confidence': request.session.get('confidence'),
                'weights_missing': request.session.get('weights_missing', False),
                'no_faces': request.session.get('no_faces', False),
                'reconstruction_method': request.session.get('reconstruction_method', 'Unknown'),
                'model_filename': request.session.get('model_filename', 'Unknown')
            }
            # Clear results from session after displaying once
            # but keep file_name if you want to allow re-processing? 
            # Better to clear to avoid showing old results.
            keys_to_clear = ['output', 'confidence', 'preprocessed_images', 'faces_cropped_images', 'reconstructed_image', 'heatmap_images', 'no_faces', 'weights_missing', 'reconstruction_method']
            for key in keys_to_clear:
                if key in request.session:
                    del request.session[key]
            
            return render(request, predict_template_name, context)
        
        # If no results but we have a file, we should process it
        # However, the previous implementation processed it in GET.
        # Let's keep the processing logic here for now but ensure it returns a response.
        
        if 'file_name' not in request.session:
            return redirect("ml_app:home")
        
        image_file = request.session['file_name']
        sequence_length = request.session.get('sequence_length', 60)
        path_to_images = [image_file]
        image_file_name = os.path.basename(image_file)
        image_file_name_only = os.path.splitext(image_file_name)[0]
        
        # Load validation dataset
        video_dataset = validation_dataset(path_to_images, sequence_length=sequence_length, transform=train_transforms)

        # Load model
        if(device == "cuda"):
            model = Model(2).cuda()
        else:
            model = Model(2).cpu()
        
        model_filename = get_accurate_model(sequence_length)
        if model_filename is None:
            # Handle case where no model is found
            image_upload_form = ImageUploadForm()
            error_message = f"No pre-trained model found for sequence length {sequence_length}. Please place the .pt model file in the 'models' directory."
            return render(request, index_template_name, {"form": image_upload_form, "error": error_message})

        request.session['model_filename'] = model_filename
        path_to_model = os.path.join(settings.PROJECT_DIR, 'models', model_filename)
        
        if not os.path.exists(path_to_model):
            image_upload_form = ImageUploadForm()
            error_message = f"Model file not found at {path_to_model}."
            return render(request, index_template_name, {"form": image_upload_form, "error": error_message})

        model.load_state_dict(torch.load(path_to_model, map_location=torch.device('cpu')))
        model.eval()
        start_time = time.time()
        
        # Preprocessing image
        print("<=== | Started Image Processing | ===>")
        preprocessed_images = []
        faces_cropped_images = []
        
        frame = cv2.imread(image_file)
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Save preprocessed image
        image_name = f"{image_file_name_only}_preprocessed.png"
        image_path = os.path.join(settings.PROJECT_DIR, 'uploaded_images', image_name)
        img_rgb = pImage.fromarray(rgb_frame, 'RGB')
        img_rgb.save(image_path)
        preprocessed_images.append(image_name)

        # Face detection and cropping
        face_locations = face_recognition.face_locations(rgb_frame)
        faces_found = 0
        if len(face_locations) > 0:
            # Training data was cropped without padding
            top, right, bottom, left = face_locations[0]
            
            # Crop the BGR frame
            frame_face = frame[top:bottom, left:right]

            # Save the cropped face (as BGR since we use cv2.imwrite or similar)
            # Actually, let's use BGR for the model but we can save as RGB for display
            image_name = f"{image_file_name_only}_cropped_face.png"
            image_path = os.path.join(settings.PROJECT_DIR, 'uploaded_images', image_name)
            cv2.imwrite(image_path, frame_face)
            
            faces_found += 1
            faces_cropped_images.append(image_name)

            # Update the dataset with the cropped face path
            video_dataset.image_paths = [image_path]
        else:
            # If no face found, we still try with the full image but it might fail
            # The user reported some fake images are detected as real.
            # If face is not cropped, the model (trained on face-only) will likely fail.
            print("No face detected in image!")

        print("<=== | Image Processing and Face Cropping Done | ===>")
        print("--- %s seconds ---" % (time.time() - start_time))

        # No face detected
        if faces_found == 0:
            request.session['no_faces'] = True
            request.session['output'] = "UNKNOWN" # Placeholder to trigger the 'if output in session' block
            return redirect('ml_app:predict')

        # Perform prediction
        try:
            heatmap_images = []
            output = ""
            confidence = 0.0
            weights_missing = False
            reconstruction_method = "N/A"

            print("<=== | Started Prediction | ===>")
            # Get the sequence of frames
            input_tensor = video_dataset[0]
            
            prediction = predict(model, input_tensor, './', image_file_name_only)
            confidence = round(prediction[1], 1)
            output = "REAL" if prediction[0] == 1 else "FAKE"
            print(f"Prediction result: {output} ({confidence}%)")
            
            # --- Integration: MAE Face Reconstruction for FAKE detections ---
            reconstructed_image_name = None
            if output == "FAKE" and faces_cropped_images:
                try:
                    print("<=== | Starting Identity-Preserving Reconstruction | ===>")
                    
                    # 1. Module 1: Generate Mask from Heatmap (Instead of simulated mask)
                    print("Module 1: Generating mask from classifier heatmap...")
                    fmap, logits = model(input_tensor.to(device))
                    idx = np.argmax(sm(logits).detach().cpu().numpy())
                    bz, nc, h, w = fmap.shape
                    weight_softmax = model.linear1.weight.detach().cpu().numpy()
                    
                    # Compute CAM-like heatmap for the last frame in sequence
                    cam = np.dot(fmap[-1].detach().cpu().numpy().reshape((nc, h*w)).T, weight_softmax[idx,:].T)
                    cam = cam.reshape(h, w)
                    cam = cam - np.min(cam)
                    cam_normalized = cam / (np.max(cam) + 1e-7)
                    
                    # Threshold to create binary mask (1 for potentially manipulated regions)
                    mask_np = (cam_normalized > 0.5).astype(np.float32)
                    mask_np = cv2.resize(mask_np, (224, 224))
                    soft_mask_np = cv2.GaussianBlur(mask_np, (15, 15), 3).astype(np.float32)
                    soft_mask_np = np.clip(soft_mask_np, 0.0, 1.0)
                    binary_mask = (soft_mask_np > 0.4).astype(np.uint8)
                    binary_mask = cv2.dilate(binary_mask, np.ones((5, 5), np.uint8), 1)
                    soft_mask_np = cv2.GaussianBlur(binary_mask.astype(np.float32), (15, 15), 3)
                    mask_tensor = torch.from_numpy(binary_mask.astype(np.float32)).unsqueeze(0).unsqueeze(0)
                    
                    # Also save heatmap for UI display
                    heatmap_path = plot_heat_map(0, model, input_tensor, './', image_file_name_only)
                    heatmap_images.append(os.path.basename(heatmap_path))

                    # 2. Load the cropped face
                    face_path = os.path.join(settings.PROJECT_DIR, 'uploaded_images', faces_cropped_images[0])
                    face_img = cv2.imread(face_path)
                    face_img = cv2.resize(face_img, (224, 224))
                    face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
                    
                    # Convert to tensor (B, C, H, W)
                    face_tensor = torch.from_numpy(face_rgb).permute(2, 0, 1).float().unsqueeze(0) / 255.0
                    
                    # 3. Load MAE model (Modules 2, 3, 4)
                    MAEFaceReconstruction, IdentityLoss = get_mae_modules()
                    mae_model = MAEFaceReconstruction(img_size=224, patch_size=16)
                    
                    # Try to load pre-trained weights if available
                    mae_weights_candidates = [
                        'mae_face_visualize_vit_base.pth',
                        'mae_visualize_vit_base.pth',
                        'mae_face_pretrain_vit_base.pth',
                        'mae_pretrain_vit_base.pth'
                    ]
                    
                    mae_weights_path = None
                    for candidate in mae_weights_candidates:
                        p = os.path.join(settings.PROJECT_DIR, 'models', candidate)
                        if os.path.exists(p):
                            mae_weights_path = p
                            break

                    if mae_weights_path:
                        print(f"Loading MAE weights from {mae_weights_path}...")
                        mae_model.load_weights(mae_weights_path)
                    else:
                        print("WARNING: No pre-trained MAE weights found.")
                        print("The reconstruction will be based on random initialization (noise).")
                        weights_missing = True
                    
                    mae_model.eval()
                    
                    print("Modules 2-4: Running MAE reconstruction with heatmap mask...")
                    with torch.no_grad():
                        # The model now handles internal normalization to [-1, 1]
                        reconstructed_tensor = mae_model(face_tensor, mask_tensor)
                    
                    # Save reconstructed image
                    reconstructed_image_name = f"{image_file_name_only}_reconstructed.png"
                    rec_path = os.path.join(settings.PROJECT_DIR, 'uploaded_images', reconstructed_image_name)
                    
                    # Convert tensor back to image (reconstructed_tensor is in [0, 1] now)
                    rec_img = reconstructed_tensor.squeeze(0).permute(1, 2, 0).cpu().numpy()
                    # Prepare original image in [0, 1] RGB
                    orig_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
                    # 3-channel soft mask for blending
                    soft_mask_3c = np.repeat(soft_mask_np[..., None], 3, axis=2)
                    # Blend reconstructed regions with original based on soft mask
                    blended = rec_img * soft_mask_3c + orig_rgb * (1.0 - soft_mask_3c)
                    blended_rgb_uint8 = (blended * 255.0).astype(np.uint8)
                    blended_bgr = cv2.cvtColor(blended_rgb_uint8, cv2.COLOR_RGB2BGR)
                    grad_score = 0.0
                    try:
                        gx = np.mean(np.abs(np.diff(rec_img, axis=0)))
                        gy = np.mean(np.abs(np.diff(rec_img, axis=1)))
                        grad_score = float(gx + gy)
                    except Exception:
                        grad_score = 0.0
                    reconstruction_method = "MAE"
                    if weights_missing or grad_score > 0.15:
                        reconstruction_method = "Fallback (Inpainting)"
                        inpaint_mask = (soft_mask_np > 0.4).astype(np.uint8) * 255
                        inpaint_mask = cv2.GaussianBlur(inpaint_mask, (9, 9), 2)
                        inpaint_bgr = cv2.inpaint(face_img, inpaint_mask, 3, cv2.INPAINT_TELEA)
                        mask3 = np.repeat(inpaint_mask[..., None], 3, axis=2)
                        try:
                            result_bgr = cv2.seamlessClone(inpaint_bgr, face_img, mask3, (112, 112), cv2.MIXED_CLONE)
                        except Exception:
                            result_bgr = inpaint_bgr
                    else:
                        # Optional: mild sharpening to improve perceived clarity
                        kernel = np.array([[0, -1, 0],
                                           [-1, 5, -1],
                                           [0, -1, 0]], dtype=np.float32)
                        result_bgr = cv2.filter2D(blended_bgr, -1, kernel)
                    cv2.imwrite(rec_path, result_bgr)
                    
                    print(f"Reconstruction saved to: {reconstructed_image_name}")
                    print("<=== | Reconstruction Done | ===>")
                except Exception as mae_e:
                    print(f"MAE Reconstruction failed: {mae_e}")
                    import traceback
                    traceback.print_exc()

            # Save results to session for GET request
            request.session['weights_missing'] = weights_missing
            request.session['preprocessed_images'] = preprocessed_images
            request.session['faces_cropped_images'] = faces_cropped_images
            request.session['reconstructed_image'] = reconstructed_image_name
            request.session['heatmap_images'] = heatmap_images
            request.session['output'] = output
            request.session['confidence'] = confidence
            request.session['reconstruction_method'] = reconstruction_method
            
            print("<=== | Prediction Done | ===>")
            print("--- %s seconds ---" % (time.time() - start_time))

            return redirect('ml_app:predict')

        except Exception as e:
            print(f"Exception occurred during prediction: {e}")
            return render(request, 'cuda_full.html')
def about(request):
    return render(request, about_template_name)

def handler404(request,exception):
    return render(request, '404.html', status=404)
def cuda_full(request):
    return render(request, 'cuda_full.html')
