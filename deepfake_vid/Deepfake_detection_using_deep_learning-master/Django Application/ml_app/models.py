from django.db import models

class AnalysisResult(models.Model):
    # Mapping to your proposed system steps
    original_image = models.CharField(max_length=255) # Path from Step 1
    result = models.CharField(max_length=10) # "REAL" or "FAKE" from Step 4/5
    confidence = models.FloatField() # Analysis confidence
    
    # Modules 2-4 outputs
    heatmap_image = models.CharField(max_length=255, null=True, blank=True) # Step 7
    reconstructed_image = models.CharField(max_length=255, null=True, blank=True) # Step 9
    reconstruction_method = models.CharField(max_length=50, null=True, blank=True) # MAE or Fallback
    
    # Forensic data
    timestamp = models.DateTimeField(auto_now_add=True) # Step 10
    
    def __str__(self):
        return f"{self.result} ({self.confidence}%) at {self.timestamp}"

    class Meta:
        ordering = ['-timestamp']
