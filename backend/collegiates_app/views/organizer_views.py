from ..permissions import IsOrganizer
from ..serializers import RegisterOrganizerSerializer

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