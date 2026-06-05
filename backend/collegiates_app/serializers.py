# Serialize data before sending to frontend
from .models import User, College, Blog, Registration, Groupset, GroupsetMember, Settings, Event
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

class RegisterCompetitorSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    school = serializers.PrimaryKeyRelatedField(queryset=College.objects.all())

    class Meta:
        model = User
        fields = ["email",
                  "password",
                  "re_password",
                  "school"
                  ]
    
    def validate(self, data):
        if data['re_password'] != data['password']:
            raise serializers.ValidationError({'re_password': 'Passwords do not match'})
        return data
    
    # called automatically on save()
    def create(self, validated_data):
        validated_data.pop('re_password')
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        user = User.objects.create_user(email=email, password=password, **validated_data) # type: ignore
        return user

class RegisterOrganizerSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    school = serializers.PrimaryKeyRelatedField(queryset=College.objects.all())

    class Meta:
        model = User
        fields = ["email",
                  "password1",
                  "password2",
                  "school"
                  ]
    
    def validate(self, data):
        if data['password1'] != data['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match'})
        return data
    
    # called automatically on save()
    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password1')
        email = validated_data.pop('email')
        user = User.objects.create_user(email=email, password=password, **validated_data) # type: ignore
        return user

class CollegeSerializer(serializers.ModelSerializer):
    class Meta:
        model = College
        fields = '__all__'

class BlogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blog
        fields = '__all__'

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['event_name', 
                  'event_level',
                  'is_nandu']
        
# Serializers for competitors registering for events
class EventRegistrationListSerializer(serializers.ListSerializer):
    def validate(self, data):
        if len(data) == 0:
            raise serializers.ValidationError("No data")
        events = [item["event"] for item in data]
        if len(events) != len(set(events)):
            raise serializers.ValidationError({'event': "Duplicate events are not allowed."})
        return data
    
class EventRegistrationSerializer(serializers.ModelSerializer):
    event = EventSerializer(read_only=True)
    event_code = serializers.CharField(write_only=True)
    
    class Meta:
        model = Registration
        fields = ['comp_year', 
                  'date_created',
                  'event',
                  'event_code',
                  'nandu_str']
        list_serializer_class = EventRegistrationListSerializer
        read_only_fields = ['comp_year', 'date_created']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data['event']['is_nandu'] == False:
            data.pop('nandu_str', None)
        for key in data['event']:
            data[key] = data['event'][key]
        data.pop("event", None)
        return data

    def validate(self, data):
        config = Settings.load()
        if config is None:
            raise serializers.ValidationError({'event': 'Competition settings have not been set'})
        # if registration is not active, return error

        user = self.context['request'].user
        event = Event.objects.filter(event_code=data['event_code']).first()

        if event is None:
            raise serializers.ValidationError({'event': f"Event with id {data['event_code']} does not exist."})
        
        if event.gender_category != user.gender:
            raise serializers.ValidationError({'event': "Competitor signed up for wrong gender category"})
        
        if event.event_level != user.level:
            raise serializers.ValidationError({'event': "Competitor signed up for wrong level"})
        
        if Registration.objects.filter(competitor=user, event=event, comp_year=config.reg_year).exists(): 
            raise serializers.ValidationError({'event': "You are already registered for this event."})
        
        data['event'] = event
        return data

    def create(self, validated_data):
        validated_data.pop('event_code', None)
        return super().create(validated_data)

class RegistrationSerializer(serializers.ModelSerializer):
    event = EventSerializer(read_only=True)
    
    class Meta:
        model = Registration
        fields = ['event', 'comp_year', 'nandu_str']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data['event']['is_nandu'] == False:
            data.pop('nandu_str', None)
        data['event_level'] = data['event']['event_level']
        data['event'] = data['event']['event_name']
        return data

# serializer for creating and retrieving competitor information on frontend
class CompetitorSerializer(serializers.ModelSerializer):
    school = serializers.StringRelatedField()
    registrations = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    re_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['user_id',
                  'first_name',
                  'last_name',
                  'password',
                  're_password', 
                  'email', 
                  'gender', 
                  'school', 
                  'student_type', 
                  'first_comp', 
                  'skill_level', 
                  'grad_date', 
                  'registrations',
                  'user_type'] # TESTING ONLY, REMOVE FOR PRODUCTION
        
    def get_registrations(self, obj):
        registrations = obj.registration_set.all()
        return RegistrationSerializer(registrations, many=True).data
    
    def validate(self, data):
        if data['password'] != data['re_password2']:
            raise serializers.ValidationError({'re_password': 'Passwords do not match'})
        return data
    
    # called automatically on save()
    def create(self, validated_data):
        validated_data.pop('re_password')
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        user = User.objects.create_user(email=email, password=password, **validated_data) # type: ignore
        return user

class OrganizerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'email', 'user_type']

class GroupsetSerializer(serializers.ModelSerializer):
    members = serializers.StringRelatedField(many=True)
    school = serializers.StringRelatedField()

    class Meta:
        model = Groupset
        fields = ['team_name', 'school', 'comp_year', 'date_created', 'members']
        read_only_fields = ['school', 'comp_year', 'date_created', 'members']

    def validate(self, data):
        config = Settings.load()
        if GroupsetMember.objects.filter(member=self.context['request'].user, groupset__comp_year=config.reg_year).exists():
            raise serializers.ValidationError({'groupset': 'You are already in a groupset'})
        if Groupset.objects.filter(team_name=data['team_name'], comp_year=config.reg_year).exists():
            raise serializers.ValidationError({'groupset': 'A groupset with this name already exists'})
        return data
    
class GroupsetMemberSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = GroupsetMember
        fields = ['groupset', 'member', 'leader']
        read_only_fields = ['member', 'leader']

    def validate(self, data):
        config = Settings.load()
        groupset = Groupset.objects.filter(groupset_id=data['groupset'].groupset_id).first()
        if groupset is None:
            raise serializers.ValidationError({'groupset': 'Groupset does not exist'})
        if groupset.comp_year != config.reg_year:
            raise serializers.ValidationError({'groupset': 'Groupset is not in current registration year'})
        if self.context['request'].user.school != groupset.school:
            raise serializers.ValidationError({'groupset': 'You must sign up for a groupset from your school'})
        if GroupsetMember.objects.filter(groupset=groupset.groupset_id, member=self.context['request'].user).exists():
            raise serializers.ValidationError({'groupset': 'You are already registered with this groupset'})
        if GroupsetMember.objects.filter(member=self.context['request'].user, groupset__comp_year=config.reg_year).exists():
            raise serializers.ValidationError({'groupset': 'You are already in a groupset'})
        if GroupsetMember.objects.filter(groupset=groupset.groupset_id).count() == 6:
            raise serializers.ValidationError({'groupset': 'Groupset is full'})
        return data
    
# Serializers for organizer tournament settings
class SettingsSerializer(serializers.ModelSerializer):
    host = serializers.SlugRelatedField(queryset=College.objects.all(), 
                                        slug_field='college_name')

    class Meta:
        model = Settings
        fields = ['reg_year', 
                  'early_reg_start', 
                  'early_reg_end', 
                  'reg_start', 
                  'reg_end',
                  'comp_date',
                  'contact_email',
                  'host',
                  'created_at']
        read_only = ['created_at']

    def validate(self, data):
        # need to implement: dates cannot be before or after current comp year
        if data['early_reg_start'] > data['early_reg_end']:
            return serializers.ValidationError("Early registration start must come after early registration ends")
        if data['early_reg_end'] > data['reg_start']:
            return serializers.ValidationError("Early registration cannot end before registration starts")
        if data['reg_start'] > data['reg_end']:
            return serializers.ValidationError("Registration start must come after registration ends")
        return data