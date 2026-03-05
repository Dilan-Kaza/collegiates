# Create your views here.
import json
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.core import serializers
from django.core.paginator import Paginator
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import Blog, College, Nandu, Registration, User, Groupset
from .forms import CreateUserForm

@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({"detail": "CSRF cookie set"})

def RegisterUser(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    form = CreateUserForm(request.POST)
    if form.is_valid():
        user = form.save()
        return JsonResponse({'success': True, 'user_id': str(user.user_id)})
    else:
        errors = {k: v.get_json_data() for k, v in form.errors.items()}
        return JsonResponse({'success': False, 'errors': errors}, status=400)


def index(request):
    return HttpResponse("Hello, world!")

def college_detail(request, college_id):
    return HttpResponse("You're looking at college %s." % college_id)

@ensure_csrf_cookie
def college_data(request):
    data = list(College.objects.values())
    return JsonResponse(data, safe=False)

def blog_data(request):
    data = list(Blog.objects.values())
    return JsonResponse(data, safe=False)

def blog_paginated(request):
    page = request.GET.get('page', 1) # get one page
    posts = Blog.objects.all().order_by('-date_created') # order asc
    paginator = Paginator(posts, 5) # 5 posts per page
    try:
        paginated_posts = paginator.page(page)
    except:
        return JsonResponse({"error": "Invalid Page"}, status=400)
    data = {
        "posts": list(paginated_posts.object_list.values()),  # Convert queryset to list
        "total_pages": paginator.num_pages,
        "current_page": paginated_posts.number,
        "has_next": paginated_posts.has_next(),
        "has_previous": paginated_posts.has_previous(),
    }
    return JsonResponse(data)

def nandu_data(request):
    data = list(Nandu.objects.values())
    return JsonResponse(data, safe=False)

def reg_events_data(request):
    data = list(Registration.objects.values())
    return JsonResponse(data, safe=False)

def team_data(request):
    data = list(Groupset.objects.values())
    return JsonResponse(data, safe=False)

def user_data(request):
    data = list(User.objects.values())
    return JsonResponse(data, safe=False)
