from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("csrf/", views.get_csrf_token, name="get_csrf_token"),
    # path("<int:college_id>/", views.college_detail, name="college_detail"),
    path("college_data/", views.college_data, name="college_data"),
    path("blog_data/", views.blog_paginated, name="blog_data"),
    path("nandu_data/", views.nandu_data, name="nandu_data"),
    path("reg_events_data/", views.reg_events_data, name="reg_events_data"),
    path("team_data/", views.team_data, name="team_data"),
    path("user_data/", views.user_data, name="user_data"),
    path("register/", views.RegisterUser, name="register"),
]