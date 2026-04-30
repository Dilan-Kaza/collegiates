# Serialize data before sending to frontend
from .models import User, College, Blog, Registration, Groupset, GroupsetMembers, Settings, Event
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


# Serializers for competitors registering for events
class ListEventRegistrationSerializer(serializers.ListSerializer):
    def validate(self, data):
        if len(data) == 0:
            raise serializers.ValidationError("No data")
        events = [item["event"] for item in data]
        if len(events) != len(set(events)):
            raise serializers.ValidationError({'event': "Duplicate events are not allowed."})
        return data
    
class EventRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = '__all__'
        list_serializer_class = ListEventRegistrationSerializer
        read_only_fields = ['competitor', 'comp_year']

    def validate(self, data):
        config = Settings.load()
        if not Event.objects.filter(event_code=data['event'].event_code).exists():
            raise serializers.ValidationError({'event': f"Event with id {data['event']} does not exist."})
        if Registration.objects.filter(competitor=self.context['request'].user, event=data['event'], comp_year=config.reg_year).exists(): # type: ignore
            raise serializers.ValidationError({'event': "You are already registered for this event."})
        return data
    
    
    
# serializer for displaying competitor information on frontend
class CompetitorSerializer(serializers.ModelSerializer):
    school = CollegeSerializer()
    registration = EventRegistrationSerializer(
        source='*',
        many=True,
        read_only=True
    )

    class Meta:
        model = User
        exclude = ['password']

class OrganizerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'email', 'user_type']

class GroupsetCreationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Groupset
        fields = ['team_name']

class GroupsetJoinSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = GroupsetMembers
        fields = ['groupset']

    def validate(self, data):
        groupset = Groupset.objects.filter(groupset_id=data['groupset'].groupset_id).first()
        if groupset is None:
            raise serializers.ValidationError({'groupset': 'Groupset does not exist'})
        if GroupsetMembers.objects.filter(groupset=groupset.groupset_id, member=self.context['request'].user).exists():
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
        exclude = ["created_at", "reg_active"]

    def validate(self, data):
        if data['early_reg_start'] > data['early_reg_end']:
            return serializers.ValidationError("Early registration start must come after early registration ends")
        if data['early_reg_end'] > data['reg_start']:
            return serializers.ValidationError("Early registration cannot end before registration starts")
        if data['reg_start'] > data['reg_end']:
            return serializers.ValidationError("Registration start must come after registration ends")
        return data