from ..permissions import IsOrganizer
from ..serializers import RegisterOrganizerSerializer, WriteSettingsSerializer, ReadSettingsSerializer
from ..models import Settings

from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from rest_framework.response import Response

# REGISTER ORGANIZER
# untested
@api_view(['POST'])
@permission_classes([IsOrganizer])
def register_organizer(request):
    serializer = RegisterOrganizerSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({'success': True, 'user_id': str(user.user_id)}, # type: ignore
                        status=status.HTTP_201_CREATED)
    else:
        return Response({'success': False, 'errors': serializer.errors}, 
                        status=status.HTTP_400_BAD_REQUEST)

# GET SETTINGS
# untested
@api_view(['POST'])
@permission_classes([IsOrganizer])
def get_settings(request):
    config = Settings.load()
    if config is None:
        return Response({"detail": "No settings have been created yet."},
                status=status.HTTP_404_NOT_FOUND
        )
    serializer = ReadSettingsSerializer(config)
    return Response(serializer.data)
    
# CREATE REGISTRATION SETTINGS
# untested
@api_view(['POST'])
@permission_classes([IsOrganizer])
def set_settings(request):
    serializer = WriteSettingsSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# UPDATE REGISTRATION SETTINGS
# untested
@api_view(['PATCH'])
@permission_classes([IsOrganizer])
def update_settings(request):
    config = Settings.load()
    if config is None:
        return Response({"detail": "No settings have been created yet."},
                status=status.HTTP_404_NOT_FOUND
        )
    serializer = WriteSettingsSerializer(config, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)