from django.urls import path
from . import views

urlpatterns = [
    path("", views.banner_list),
    path("slots/", views.slot_list),
]
