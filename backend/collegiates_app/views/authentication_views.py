from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.core.exceptions import ValidationError

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ..permissions import IsCompetitor, IsOrganizer, IsAuthenticated
from ..models import User
from ..serializers import RegisterCompetitorSerializer, RegisterOrganizerSerializer

# SIGN INTO COMPETITOR ACCOUNT
@api_view(['POST'])
@permission_classes([AllowAny])
def signin(request):
    # email and password fields should be verified on frontend
    email = request.data.get('email')
    password = request.data.get('password')

    user = authenticate(request, email=email, password=password)
    if user is not None:
        login(request, user)
        return Response({'success': True, 'user_id': str(user.user_id)}) # type: ignore
    else:
        return Response({'success': False, 'error': 'Invalid credentials'}, 
                            status=status.HTTP_401_UNAUTHORIZED
        )

# SIGN OUT OF COMPETITOR ACCOUNT
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def signout(request):   
    logout(request)
    return Response({'success': True})

# SIGN UP FOR COMPETITOR ACCOUNT
@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    serializer = RegisterCompetitorSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({'success': True, 'user_id': str(user.user_id)}, # type: ignore
                        status=status.HTTP_201_CREATED)
    else:
        return Response({'success': False, 'errors': serializer.errors}, 
                        status=status.HTTP_400_BAD_REQUEST)

# CHECK DB FOR COMPETITOR ACCOUNT ASSOCIATED WITH EMAIL
@api_view(['GET'])
@permission_classes([AllowAny])
def check_email(request):
    email = request.query_params.get('email', '')
    exists = User.objects.filter(email__iexact=email, user_type='competitor').exists()
    return Response({'exists': exists})