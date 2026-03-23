"""
URL configuration for user_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def root_view(request):
    """Handle root path requests"""
    return JsonResponse({
        'service': 'User Service',
        'port': 8000,
        'message': 'User Service is running. Use API Gateway at port 8002 for API calls.',
        'endpoints': {
            'login': '/login/',
            'register': '/register/',
            'token_refresh': '/token/refresh/'
        }
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('accounts.urls')),  # Include accounts URLs first
    # Note: root_view will only be called if no other path matches
    # Since accounts.urls doesn't have a root path, we add it here
    path('', root_view, name='root'),  # Handle root path last
]
