from django.urls import path
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
path('', views.home, name='home'),
path('places', views.places, name='places'), # GET /places?lat=..&lng=..&type=..
path('save-search/', views.save_search, name='save_search'),

path('register/', views.register, name='register'),
path('login/', auth_views.LoginView.as_view(template_name='services/login.html'), name='login'),
path('logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
]