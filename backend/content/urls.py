from django.urls import path
from .views import get_best_content, upload_content, list_all_contents, download_proxy, get_download_history

urlpatterns = [
    path('get-content/', get_best_content),
    path('upload-content/', upload_content),
    path('contents/', list_all_contents),
    path('download/<int:content_id>/', download_proxy),
    path('download-history/<str:client_id>/', get_download_history),
] 