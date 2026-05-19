from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import generics

from django.db import transaction

from ..permissions import IsCompetitor
from ..models import User, Registration, Groupset, GroupsetMember, Settings, Event
from ..serializers import EventRegistrationSerializer, \
    CompetitorSerializer, GroupsetSerializer, \
        GroupsetMemberSerializer, EventSerializer

def requires_settings(method):
    def wrapper(self, request, *args, **kwargs):
        config = Settings.load()
        if config is None:
            return Response(
                {"detail": "No settings have been created yet."},
                status=status.HTTP_404_NOT_FOUND
            )
        self.config = config
        return method(self, request, *args, **kwargs)
    return wrapper

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
    queryset = Registration.objects.select_related('event')
    serializer_class = EventRegistrationSerializer
    permission_classes = [IsCompetitor]
    

    def get_serializer(self, *args, **kwargs):
        kwargs['many'] = True
        return super().get_serializer(*args, **kwargs)

    @requires_settings
    def perform_create(self, serializer):
        serializer.save(competitor=self.request.user,
                        comp_year=self.config.reg_year)

    def get_queryset(self):
        if not hasattr(self, 'config'):
            return Registration.objects.none()
        return Registration.objects.filter(
            competitor = self.request.user,
            comp_year = self.config.reg_year
        ).prefetch_related('event')
    
    @requires_settings
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)    

class Competitor(generics.RetrieveUpdateDestroyAPIView):
    """
        GET: Retrieve competitor info + registration
        DELETE: Delete competitor account
        PATCH: Update competitor information
    """
    queryset = User.objects.prefetch_related('events')
    serializer_class = CompetitorSerializer
    permission_classes = [IsCompetitor]
    
    def get_object(self):
        return self.request.user


# GET COMPETITOR INFO
@api_view(['GET'])
@permission_classes([IsCompetitor])
def my_profile(request):
    uid = request.user.user_id
    user = User.objects.prefetch_related('events').get(user_id=uid)
    serializer = CompetitorSerializer(user)
    return Response(serializer.data)

class CreateGroupset(generics.CreateAPIView):
    """
        POST: Create a new groupset and add competitor as leader
    """

    queryset = Groupset.objects.prefetch_related('members')
    serializer_class = GroupsetSerializer
    permission_classes = [IsCompetitor]

    @requires_settings
    def perform_create(self, serializer):
        with transaction.atomic():
            groupset = serializer.save(school=self.request.user.school, comp_year=self.config.reg_year) # type: ignore
            GroupsetMember.objects.create(groupset=groupset, member=self.request.user, leader=True)

class JoinGroupset(generics.ListCreateAPIView):
    """
        GET: List all groupsets that a competitor can sign up for
        POST: Add competitor as a member of a groupset
    """

    queryset = Groupset.objects.prefetch_related('members')
    serializer_class = GroupsetSerializer
    permission_classes = [IsCompetitor]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            self.serializer_class = GroupsetMemberSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        if not hasattr(self, 'config'):
            return Groupset.objects.none()
        return Groupset.objects.filter(
            school = self.request.user.school,
            comp_year = self.config.reg_year
        ).prefetch_related('members')

    @requires_settings
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)