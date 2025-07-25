from django.urls import path
from .views import get_best_content, upload_content, list_all_contents

urlpatterns = [
    path('get-content/', get_best_content),
    path('upload-content/', upload_content),
    path('contents/', list_all_contents),
] 