from rest_framework.permissions import BasePermission, IsAuthenticated

class IsOrganizer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user is not None and request.user.is_authenticated and request.user.is_organizer)

class IsCompetitor(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user is not None and request.user.is_authenticated and request.user.is_competitor)