# Serialize data before sending to frontend
from .models import User, College, Blog, Registration, Groupset, GroupsetMember, Settings, Event
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


class RegisterCompetitorSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email",
                  "password1",
                  "password2",        
                  "first_name", 
                  "last_name", 
                  "gender", 
                  "school", 
                  "student_type",
                  "first_comp",
                  "skill_level",
                  "grad_date"
                  ]
    
    def validate(self, data):
        if data['password1'] != data['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match'})
        return data
    
    # called automatically on save()
    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password1')
        user = User(user_type='competitor', **validated_data)
        user.set_password(password)
        user.save()
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
        user = User(user_type='organizer', **validated_data)
        user.set_password(password)
        user.save()
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
    event = EventSerializer()

    class Meta:
        model = Registration
        fields = ['comp_year', 
                  'date_created',
                  'event',
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
        
        user_gender = self.context['request'].user.gender
        event_gender = data['event'].gender_category
        if event_gender != user_gender:
            raise serializers.ValidationError({'event': "Competitor signed up for wrong gender category"})
        
        user_level = self.context['request'].user.skill_level
        event_level = data['event'].event_level
        if event_level != user_level:
            raise serializers.ValidationError({'event': "Competitor signed up for wrong level"})

        if not Event.objects.filter(event_code=data['event'].event_code).exists():
            raise serializers.ValidationError({'event': f"Event with id {data['event']} does not exist."})
        
        if Registration.objects.filter(competitor=self.context['request'].user, event=data['event'], comp_year=config.reg_year).exists(): # type: ignore
            raise serializers.ValidationError({'event': "You are already registered for this event."})
        
        return data

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

# serializer for displaying competitor information on frontend
class CompetitorSerializer(serializers.ModelSerializer):
    school = serializers.StringRelatedField()
    registrations = serializers.SerializerMethodField()
    

    class Meta:
        model = User
        fields = ['user_id', 
                  'email', 
                  'gender', 
                  'school', 
                  'student_type', 
                  'first_comp', 
                  'skill_level', 
                  'grad_date', 
                  'registrations']
        
    def get_registrations(self, obj):
        registrations = obj.registration_set.all()
        return RegistrationSerializer(registrations, many=True).data

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
        if GroupsetMember.objects.filter(member=self.context['request'].user).exists():
            raise serializers.ValidationError({'groupset': 'You are already in a groupset'})
        if Groupset.objects.filter(team_name=data['team_name'], comp_year=config.reg_year).exists():
            raise serializers.ValidationError({'groupset': 'A groupset with this name already exists'})
        return data
    
class GroupsetMemberSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = GroupsetMember
        fields = ['groupset']
        read_only_fields = ['member', 'leader']

    def validate(self, data):
        groupset = Groupset.objects.filter(groupset_id=data['groupset'].groupset_id).first()
        if groupset is None:
            raise serializers.ValidationError({'groupset': 'Groupset does not exist'})
        if GroupsetMember.objects.filter(groupset=groupset.groupset_id, member=self.context['request'].user).exists():
            raise serializers.ValidationError({'groupset': 'You are already registered with this groupset'})
        if self.context['request'].user.school != groupset.school:
            raise serializers.ValidationError({'groupset': 'You must sign up for a groupset from your school'})
        return data
    
# Serializers for organizer tournament settings
class ReadSettingsSerializer(serializers.ModelSerializer):
    host = CollegeSerializer()

    class Meta:
        model = Settings
        fields = "__all__"
        read_only_fields = ["created_at"]

class WriteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settings
        exclude = ["created_at"]

    def validate(self, data):
        if data['early_reg_start'] > data['early_reg_end']:
            return serializers.ValidationError("Early registration start must come after early registration ends")
        if data['early_reg_end'] > data['reg_start']:
            return serializers.ValidationError("Early registration cannot end before registration starts")
        if data['reg_start'] > data['reg_end']:
            return serializers.ValidationError("Registration start must come after registration ends")
        return data