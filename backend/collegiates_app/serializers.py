# Serialize data before sending to frontend
from .models import User, College, Blog, Registration, Groupset, GroupsetMembers
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


class RegisterCompetitorSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    school = serializers.PrimaryKeyRelatedField(queryset=College.objects.all())

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

class EventRegistrationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Registration
        fields = '__all__'

class CompetitorSerializer(serializers.ModelSerializer):
    school = CollegeSerializer()
    registration = EventRegistrationSerializer(
        source='registration_set',
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
    school = serializers.PrimaryKeyRelatedField(queryset=College.objects.all())

    class Meta:
        model = Groupset
        fields = ['comp_year', 'school', 'team_name']

class GroupsetJoinSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupsetMembers
        fields = ['member', 'leader']