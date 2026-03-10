from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..models import User, Registration
from ..serializers import RegisterWriteSerializer, EventRegistrationSerializer, UserSerializer

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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def signout(request):   
    logout(request)
    return Response({'success': True})

@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    serializer = RegisterWriteSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({'success': True, 'user_id': str(user.user_id)}, # type: ignore
                        status=status.HTTP_201_CREATED)
    else:
        return Response({'success': False, 'errors': serializer.errors}, 
                        status=status.HTTP_400_BAD_REQUEST)

# untested    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_password_link(request):
    email = request.data.get('email')
    try:
        user = User.objects.filter(email__iexact=email)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.values('user_id')))
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

# untested
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_password_confirm(request):
    uid = request.data.get('user_id')
    token = request.data.get('token')
    new_password = request.data.get('password')

    try:
        user = User.objects.get(user_id = uid)
        pk = force_str(urlsafe_base64_decode(uid))
    except (User.DoesNotExist, ValueError):
        return Response({'error': 'Invalid reset link'}, status=status.HTTP_400_BAD_REQUEST)
    if not default_token_generator.check_token(token):
        return Response({'error': 'Link is invalid or has expired'}, status=status.HTTP_400_BAD_REQUEST)
    
    user.set_password(new_password)
    user.save()

    return Response({'success': True})

@api_view(['GET'])
@permission_classes([AllowAny])
def check_email(request):
    email = request.query_params.get('email', '')
    exists = User.objects.filter(email__iexact=email).exists()
    return Response({'exists': exists})

# untested
@api_view(['POST'])
@permission_classes(IsAuthenticated)
def register_events(request):
    # request contains {events: {...}, competition_year: ""}
    events = request.data.get('events')
    year = request.data.get('year')
    user_id = request.user.id

    event_rows = []
    for event in events:
        event_rows.append(Registration(competitor=user_id, comp_year=year, event=event))

    Registration.objects.bulk_create(event_rows)

# untested
@api_view(['GET'])
@permission_classes(IsAuthenticated)
def get_registration(request):
    user_id = request.user.id
    comp_year = request.data.get('comp_year')
    events = Registration.objects.filter(competitor=user_id, comp_year=comp_year)
    serializer = EventRegistrationSerializer(events, many=True)
    return Response(serializer.data)

# untested
@api_view(['GET'])
@permission_classes(IsAuthenticated)
def get_user(request):
    user = request.user
    serializer = UserSerializer(user)
    return Response(serializer.data)

    
