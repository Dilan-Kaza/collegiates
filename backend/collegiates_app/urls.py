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
    path('profile/', views.Competitor.as_view(), name="my_profile"),
    path('registration/', views.RegisterEvents.as_view(), name="registration"),
    path('events/', views.GetEvents.as_view(), name="get_events"),
    path('groupset/', views.CreateGroupset.as_view(), name="groupset"),
    path('groupset-members/', views.JoinGroupset.as_view(), name="groupset_members")
]