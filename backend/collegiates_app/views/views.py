# Create your views here.
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination


from ..models import Blog, College
from ..serializers import CollegeSerializer, BlogSerializer

@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({"detail": "CSRF cookie set"})

@api_view(['GET'])
@permission_classes([AllowAny])
def college_data(request):
    colleges = College.objects.all().order_by("college_name")
    serializer = CollegeSerializer(colleges, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def blog_paginated(request):
    posts = Blog.objects.all().order_by('-date_created') # order asc
    paginator = PageNumberPagination() # 5 posts per page
    paginator.page_size = 5
    paginated_posts = paginator.paginate_queryset(posts, request)
    serializer = BlogSerializer(paginated_posts, many=True)
    return Response(serializer.data)
