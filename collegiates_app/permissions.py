from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .models import Settings

class IsOrganizer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_organizer)

class IsCompetitor(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_competitor)
    
class RegistrationActive(BasePermission):
    def has_permission(self, request, view):
        config = Settings.load()
        if not config.reg_active:
            raise PermissionDenied('Registration is not active')
        return True
