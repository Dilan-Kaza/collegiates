from django.shortcuts import render

# Create your views here.
from django.http import HttpResponse, JsonResponse
from django.core import serializers
from django.core.paginator import Paginator


from .models import Blog, College, Nandu, Registration, User

def index(request):
    return HttpResponse("Hello, world!")

def college_detail(request, college_id):
    return HttpResponse("You're looking at college %s." % college_id)


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
    data = list(Team.objects.values())
    return JsonResponse(data, safe=False)

def user_data(request):
    data = list(UserAccount.objects.values())
    return JsonResponse(data, safe=False)
