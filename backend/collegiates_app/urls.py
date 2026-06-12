from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter

from .views import *

router = DefaultRouter()
router.register(r'blog', OrganizerBlogView, basename='blog')
router.register(r'groupset', OrganizerGroupsetView, basename='groupset')

urlpatterns = [
    re_path(r'^auth/', include('djoser.urls')),
    re_path(r'^auth/', include('djoser.urls.jwt')),
    path("auth/signup/", signup, name="signup"),
    path("auth/signin/", signin, name="signin"),
    path("auth/signout/", signout, name="signout"),
    path("csrf/", get_csrf_token, name="get_csrf_token"),
    path("college_data/", college_data, name="college_data"),
    path('check-email/', check_email, name="check_email"),
    path('competitor/profile/', CompetitorInfoView.as_view(), name="my_profile"),
    path('competitor/registration/', CompetitorRegistrationView.as_view(), name="registration"),
    path('competitor/events/', CompetitorEventsView.as_view(), name="get_events"),
    path('competitor/groupset/', CompetitorCreateGroupsetView.as_view(), name="groupset"),
    path('competitor/groupset-members/', CompetitorJoinGroupsetView.as_view(), name="groupset_members"),
    path('organizer/settings/', OrganizerSettingsView.as_view({'get': 'retrieve', 
                                                   'post': 'create',
                                                   'patch': 'update'}), 
                                                   name="competition_settings"),
    path('organizer/', include(router.urls))
]


