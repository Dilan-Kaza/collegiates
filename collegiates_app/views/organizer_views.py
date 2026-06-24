
from rest_framework import viewsets, mixins
from rest_framework.permissions import AllowAny
from django.core.cache import cache
from ..permissions import IsOrganizer
from ..models import Groupset, Settings, Blog
from ..serializers import GroupsetSerializer, \
        SettingsSerializer, BlogSerializer, \
        OrganizerGroupsetSerializer
from .competitor_views import requires_settings

# ORGANIZER ENDPOINTS
class OrganizerGroupsetView(viewsets.ModelViewSet):
    """
        GET: list current year groupsets
        GET(pk): get groupset
        POST: create groupset
        PATCH/PUT: update groupset
        DELETE: delete blog post
    """

    queryset = Groupset.objects.prefetch_related('members')
    serializer_class = OrganizerGroupsetSerializer
    permission_classes = [IsOrganizer]

    def get_queryset(self):
        if not hasattr(self, 'config'):
            return Groupset.objects.none()
        return Groupset.objects.filter(
            comp_year = self.config.reg_year
        ).prefetch_related('members')

    @requires_settings
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @requires_settings
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @requires_settings
    def perform_create(self, serializer):
        serializer.save(comp_year=self.config.reg_year)

    @requires_settings
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @requires_settings
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

class OrganizerSettingsView(viewsets.GenericViewSet, 
                          mixins.RetrieveModelMixin,
                          mixins.CreateModelMixin,
                          mixins.UpdateModelMixin):
    """
        GET: retrieve competition settings
        POST: create competition settings
        PATCH: update competition settings
    """
    queryset = Settings.objects.none()
    serializer_class = SettingsSerializer
    permission_classes = [IsOrganizer]

    def get_permissions(self):
        if self.request.method == 'GET':
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsOrganizer]
        
         return [permission() for permission in permission_classes]

    def get_object(self):
        return Settings.load()
    
    def perform_create(self, serializer):
        obj = serializer.save()
        cache.set("competition_settings_latest", obj, timeout=3600)

    def perform_update(self, serializer):
        obj = serializer.save()
        cache.set("competition_settings_latest", obj, timeout=3600)
    
class OrganizerBlogView(viewsets.ModelViewSet):
    """
        GET: list blog posts
        GET(pk): retrieve blog post
        POST: create blog post
        PATCH/PUT: update blog post
        DELETE: delete blog post
    """

    queryset = Blog.objects.all()
    serializer_class = BlogSerializer
    permission_classes = [IsOrganizer]

    def get_permissions(self):
        permission_classes = self.permission_classes
        if self.request.method == 'GET':
            permission_classes = [AllowAny]
        return [permissions() for permissions in permission_classes]
