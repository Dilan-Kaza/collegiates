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

from ..permissions import IsCompetitor
from ..models import User, Registration, GroupsetMembers, Settings
from ..serializers import RegisterCompetitorSerializer, ReadEventRegistrationSerializer, \
    CompetitorSerializer, GroupsetCreationSerializer, GroupsetJoinSerializer, WriteEventRegistrationSerializer

# SIGN INTO COMPETITOR ACCOUNT
@api_view(['POST'])
@permission_classes([AllowAny])
def signin(request):
    # email and password fields should be verified on frontend
    email = request.data.get('email').lower()
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
@permission_classes([IsCompetitor])
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

# SEND PASSWORD RECOVERY LINK
# untested    
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_link(request):
    email = request.data.get('email')
    try:
        user = User.objects.get(email__iexact=email)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.user_id))
        reset_link = f"http://localhost:3000/reset-password?uid={uid}&token={token}"
        send_mail(
            subject="Password Reset",
            message=f"Click the link to reset your password: {reset_link}",
            from_email="noreply@collegiatewushu.com",
            recipient_list=[email],
        )
    except User.DoesNotExist:
        pass
    return Response({'success': True})

# PASSWORD RECOVERY LINK
# untested
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_confirm(request):
    uid = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('password')

    try:
        pk = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(user_id = pk)
    except (User.DoesNotExist, ValueError, ValidationError):
        return Response({'error': 'Invalid reset link'}, status=status.HTTP_400_BAD_REQUEST)
    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Link is invalid or has expired'}, status=status.HTTP_400_BAD_REQUEST)
    
    user.set_password(new_password)
    user.save()

    return Response({'success': True})

# CHECK DB FOR COMPETITOR ACCOUNT ASSOCIATED WITH EMAIL
@api_view(['GET'])
@permission_classes([AllowAny])
def check_email(request):
    email = request.query_params.get('email', '')
    exists = User.objects.filter(email__iexact=email).filter(user_type='competitor').exists()
    return Response({'exists': exists})

# REGISTER COMPETITORS FOR EVENTS
# untested
@api_view(['POST'])
@permission_classes([IsCompetitor])
def register_events(request):
    config = Settings.load()
    if config is None:
        return Response({"detail": "No settings have been created yet."},
                status=status.HTTP_404_NOT_FOUND
        )
    serializer = WriteEventRegistrationSerializer(data=request.data, many=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    events = [item['event'] for item in serializer.validated_data]
    year = config.reg_year
    
    event_rows = [Registration(competitor=request.user, comp_year=year, event=event) for event in events]
    Registration.objects.bulk_create(event_rows)

    return Response(
        {"detail": f"Successfully registered for {len(event_rows)} event(s)."},
        status=status.HTTP_201_CREATED
    )

# GET COMPETITION REGISTRATION INFO
# untested
@api_view(['GET'])
@permission_classes([IsCompetitor])
def get_registration(request):
    config = Settings.load()
    if config is None:
        return Response({"detail": "No settings have been created yet."},
                status=status.HTTP_404_NOT_FOUND
        )
    year = config.reg_year
    user_id = request.user.user_id
    events = Registration.objects.filter(competitor=user_id, comp_year=year)
    serializer = ReadEventRegistrationSerializer(events, many=True)
    return Response(serializer.data)

# GET COMPETITOR INFO
@api_view(['GET'])
@permission_classes([IsCompetitor])
def my_profile(request):
    uid = request.user.user_id
    user = User.objects.select_related('school').get(user_id=uid)
    serializer = CompetitorSerializer(user)
    return Response(serializer.data)

# CREATE GROUPSET
# untested
@api_view(['POST'])
@permission_classes([IsCompetitor])
def create_groupset(request):
    user = request.user.id
    groupset_serializer = GroupsetCreationSerializer(data=request.data)
    if groupset_serializer.is_valid():
        groupset = groupset_serializer.save()
        leader = GroupsetMembers.objects.create(groupset=groupset, member=user, leader=True)
        return Response({'success': True, 'groupset_id': str(groupset.groupset_id), 'leader_id': str(leader.member)}, # type: ignore
                        status=status.HTTP_201_CREATED)
    else:
        return Response({'success': False, 'errors': groupset_serializer.errors}, 
                        status=status.HTTP_400_BAD_REQUEST)

# JOIN GROUPSET
# untested
@api_view(['POST'])
@permission_classes([IsCompetitor])
def join_groupset(request):
    uid = request.user.user_id
    member = GroupsetMembers.objects.create(member=uid, leader=False)
