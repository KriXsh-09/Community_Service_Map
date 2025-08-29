from django.db import models
from django.utils import timezone

class SearchQuery(models.Model):
    query = models.CharField(max_length=255, blank=True, null=True)   # e.g. "pharmacy"
    place_type = models.CharField(max_length=100, blank=True, null=True)  # e.g. "hospital"
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.query or self.place_type} @ {self.latitude}, {self.longitude}"
