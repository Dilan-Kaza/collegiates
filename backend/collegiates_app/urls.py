from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.get_csrf_token, name="get_csrf_token"),
    path("college_data/", views.college_data, name="college_data"),
    path("blog_data/", views.blog_paginated, name="blog_data"),
    path("signup/", views.signup, name="signup"),
    path("signin/", views.signin, name="signin"),
    path("signout/", views.signout, name="signout"),
    path("reset-password/", views.reset_password_link, name="reset_password"),
    path("reset-password-confirm/", views.reset_password_confirm, name="reset_password_confirm"),
    path('check-email/', views.check_email, name="check_email"),
    path('my_profile/', views.my_profile, name="my_profile"),
    path('register_events/', views.RegisterEvents.as_view(), name="register_events"),
    path('create_groupset/', views.create_groupset, name="create_groupset"),
    path('join_groupset/', views.join_groupset, name="join_groupset")
]