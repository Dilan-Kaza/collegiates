
from rest_framework.permissions import AllowAny
from rest_framework import generics, filters, viewsets, mixins
from django.core.cache import cache
from ..permissions import IsOrganizer
from ..models import Groupset, Settings, Blog, Registration, User, Event
from ..serializers import (
        GroupsetSerializer,
        SettingsSerializer, 
        BlogSerializer,
        OrganizerGroupsetSerializer, 
        OrganizerRegistrationSerializer,
        EventSerializer
    )
from .competitor_views import requires_settings


# ORGANIZER ENDPOINTS
class OrganizerGroupsetView(viewsets.ModelViewSet):
    """
        GET: list current year groupsets
        GET(pk): get groupset
        POST: create groupset
        PATCH: update groupset
        DELETE: delete blog post
    """

    queryset = Groupset.objects.prefetch_related('members')
    serializer_class = OrganizerGroupsetSerializer
    permission_classes = [IsOrganizer]
    http_method_names = ['get', 'post', 'patch', 'delete']

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

    queryset = Blog.objects.order_by('-date_created').all()
    serializer_class = BlogSerializer
    permission_classes = [IsOrganizer]

    def get_permissions(self):
        permission_classes = self.permission_classes
        if self.request.method == 'GET':
            permission_classes = [AllowAny]
        return [permissions() for permissions in permission_classes]

class OrganizerRegistrationView(viewsets.ModelViewSet):
    """
        GET: list all registration
        GET(pk): retrieve registration for a user
        PATCH: update registration
    """

    queryset = User.objects.all()
    serializer_class = OrganizerRegistrationSerializer
    permission_classes = [IsOrganizer]
    http_method_names = ['get', 'patch']
    # filter_backends = [filters.SearchFilter]
    # search_fields = ['first_name', 'school__college_name']
    filterset_fields = ['has_paid', 'proof_of_reg', 'is_competing', 'school']

    def get_queryset(self):
        if not hasattr(self, 'config'):
            return User.objects.none()
        return User.objects.filter(
            registration__comp_year = self.config.reg_year
        ).prefetch_related('registration__event').distinct()
    
    @requires_settings
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)    

    @requires_settings
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @requires_settings
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @requires_settings
    def perform_update(self, serializer):
        serializer.save(comp_year=self.config.reg_year)
    
class OrganizerEventsView(generics.ListAPIView):
    """
        GET: List all events
    """
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsOrganizer]
