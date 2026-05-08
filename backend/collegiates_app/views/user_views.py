from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import generics

from ..permissions import IsCompetitor
from ..models import User, Registration, Groupset, GroupsetMembers, Settings, Event
from ..serializers import EventRegistrationSerializer, \
    CompetitorSerializer, GroupsetCreationSerializer, GroupsetJoinSerializer, EventSerializer

class GetEvents(generics.ListAPIView):
    """
        GET: List all events a competitor can register for
    """
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsCompetitor]

    def get_queryset(self):
        queryset = Event.objects.filter(
            event_level__iexact = self.request.user.skill_level,
            gender_category__iexact = self.request.user.gender
        )
        return queryset

class RegisterEvents(generics.ListCreateAPIView):
    """
        GET: List all events a user is registered to for this current competition year
        POST: Register user for current competition year with multiple events
    """
    queryset = Registration.objects.all()
    serializer_class = EventRegistrationSerializer
    permission_classes = [IsCompetitor]

    def _check_settings(self):
        config = Settings.load()
        if config is None:
            return Response({"detail": "No settings have been created yet."},
                status=status.HTTP_404_NOT_FOUND
        )
        return config
    
    def get_serializer(self, *args, **kwargs):
        # kwargs['many'] = True
        return super().get_serializer(*args, **kwargs)

    def create(self, request, *args, **kwargs):
        config = self._check_settings()
        if isinstance(config, Response):
            return config
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(competitor=self.request.user, comp_year=config.reg_year) # type: ignore
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        config = self._check_settings()
        if isinstance(config, Response):
            return Registration.objects.none()
        return Registration.objects.filter(
            competitor = self.request.user,
            comp_year = config.reg_year
        ).prefetch_related('event')
    
    def get(self, request, *args, **kwargs):
        config = self._check_settings()
        if isinstance(config, Response):
            return config
        return super().get(request, *args, **kwargs)    

# GET COMPETITOR INFO
@api_view(['GET'])
@permission_classes([IsCompetitor])
def my_profile(request):
    uid = request.user.user_id
    user = User.objects.prefetch_related('events').get(user_id=uid)
    serializer = CompetitorSerializer(user)
    return Response(serializer.data)

# CREATE GROUPSET
@api_view(['POST'])
@permission_classes([IsCompetitor])
def create_groupset(request):
    config = Settings.load()
    if config is None:
        return Response({"detail": "No settings have been created yet."},
                status=status.HTTP_404_NOT_FOUND
        )
    user = request.user
    school = request.user.school
    groupset_serializer = GroupsetCreationSerializer(data=request.data)
    if groupset_serializer.is_valid():
        team_name = groupset_serializer.validated_data['team_name'] # type: ignore
        groupset = Groupset.objects.create(comp_year=config.reg_year, school=school, team_name=team_name)
        leader = GroupsetMembers.objects.create(groupset=groupset, member=user, leader=True)
        return Response({'success': True, 'groupset_id': str(groupset.groupset_id), 'leader_id': str(leader.member)}, # type: ignore
                        status=status.HTTP_201_CREATED)
    else:
        return Response({'success': False, 'errors': groupset_serializer.errors}, 
                        status=status.HTTP_400_BAD_REQUEST)

# JOIN GROUPSET
# untested
# needs work
@api_view(['POST'])
@permission_classes([IsCompetitor])
def join_groupset(request):
    uid = request.user.user_id
    serializer = GroupsetJoinSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        groupset = serializer.validated_data['groupset'] # type: ignore
        member = GroupsetMembers.objects.create(groupset=groupset, member_id=uid, leader=False)
        return Response({'success': True, 'member': str(member.member)}, # type: ignore
                        status=status.HTTP_201_CREATED)
    else:
        return Response({'success': False, 'errors': serializer.errors}, 
                        status=status.HTTP_400_BAD_REQUEST)