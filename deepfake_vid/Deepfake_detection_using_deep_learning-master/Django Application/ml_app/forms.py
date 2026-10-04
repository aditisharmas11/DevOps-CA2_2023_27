from django import forms

class ImageUploadForm(forms.Form):

    upload_image_file = forms.ImageField(label="Select Image", required=True, widget=forms.FileInput(attrs={"accept": "image/*"}))
