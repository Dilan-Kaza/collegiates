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
        fields = ['event_code',
                  'event_name', 
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
        fields = ['competitor',
                  'comp_year', 
                  'date_created',
                  'event',
                  'event_code',
                  'nandu_str']
        list_serializer_class = EventRegistrationListSerializer
        read_only_fields = ['competitor', 'comp_year', 'date_created']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data['event']['is_nandu'] == False:
            data.pop('nandu_str', None)
        for key in data['event']:
            data[key] = data['event'][key]
        data.pop("event", None)
        data.pop("competitor")
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
        
        if event.event_level != user.skill_level:
            raise serializers.ValidationError({'event': "Competitor signed up for wrong level"})
        
        if Registration.objects.filter(competitor=user, event=event, comp_year=config.reg_year).exists(): 
            raise serializers.ValidationError({'event': "You are already registered for this event."})
        
        data['event'] = event
        return data

    def create(self, validated_data):
        validated_data.pop('event_code', None)
        return super().create(validated_data)

# serializer for creating and retrieving competitor information on frontend
class CompetitorSerializer(serializers.ModelSerializer):
    school = serializers.PrimaryKeyRelatedField(queryset=College.objects.all())  # handles write (UUID)
    school_name = serializers.StringRelatedField(source='school', read_only=True)  # handles read (string)
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
                  'school_name', 
                  'student_type', 
                  'first_comp', 
                  'skill_level', 
                  'grad_date', 
                  'registrations',
                  'user_type'] # TESTING ONLY, REMOVE FOR PRODUCTION
        
    def get_registrations(self, obj):
        registrations = obj.registration.all()
        return EventRegistrationSerializer(registrations, many=True).data
    
    def validate(self, data):
        if data['password'] != data['re_password']:
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
    members = serializers.StringRelatedField(many=True, read_only=True)
    school = serializers.StringRelatedField()

    class Meta:
        model = Groupset
        fields = ['groupset_id', 'team_name', 'school', 'comp_year', 'date_created', 'members']
        read_only_fields = ['groupset_id', 'school', 'comp_year', 'date_created', 'members']

    def validate(self, data):
        config = Settings.load()
        user = self.context['request'].user
        if user.is_competitor & GroupsetMember.objects.filter(member=user, groupset__comp_year=config.reg_year).exists():
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
        user = self.context['request'].user
        if user.is_competitor:
            if groupset is None:
                raise serializers.ValidationError({'groupset': 'Groupset does not exist'})
            if groupset.comp_year != config.reg_year:
                raise serializers.ValidationError({'groupset': 'Groupset is not in current registration year'})
            if self.context['request'].user.school != groupset.school:
                raise serializers.ValidationError({'groupset': 'You must sign up for a groupset from your school'})
            if GroupsetMember.objects.filter(groupset=groupset.groupset_id, member=user).exists():
                raise serializers.ValidationError({'groupset': 'You are already registered with this groupset'})
            if GroupsetMember.objects.filter(member=user, groupset__comp_year=config.reg_year).exists():
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
                  'early_reg_cost_first',
                  'early_reg_cost_extra',
                  'reg_start', 
                  'reg_end',
                  'reg_cost_first',
                  'reg_cost_extra',
                  'comp_date',
                  'contact_email',
                  'host',
                  'created_at']
        read_only_fields = ['created_at']

    def validate(self, data):
        # need to implement: dates cannot be before or after current comp year
        if data['early_reg_start'] > data['early_reg_end']:
            return serializers.ValidationError("Early registration start must come after early registration ends")
        if data['early_reg_end'] > data['reg_start']:
            return serializers.ValidationError("Early registration cannot end before registration starts")
        if data['reg_start'] > data['reg_end']:
            return serializers.ValidationError("Registration start must come after registration ends")
        return data
    
class OrganizerGroupsetSerializer(serializers.ModelSerializer):
    
    class MemberSerializer(serializers.ModelSerializer):
        name = serializers.SerializerMethodField()
        class Meta:
            model = User
            fields = ['user_id', 'name']
        def get_name(self, obj):
            return str(obj)

    members = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all(), allow_null=True)
    school = serializers.PrimaryKeyRelatedField(queryset=College.objects.all(), allow_null=True)
    school_name = serializers.StringRelatedField(source='school', read_only=True)
    leader = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), allow_null=True)
    
    class Meta:
        model = Groupset
        fields = ['groupset_id', 
                  'comp_year', 
                  'date_created', 
                  'team_name', 
                  'school_name', 
                  'school', 
                  'members', 
                  'leader']
        read_only_fields = ['groupset_id', 
                            'comp_year', 
                            'date_created', 
                            'school_name']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['members'] = self.MemberSerializer(instance.members, many=True).data
        leader = User.objects.get(groupset_member__groupset=instance.groupset_id, groupset_member__leader=True)
        representation['leader'] = self.MemberSerializer(leader).data
        representation['school'] = {'school_name': representation['school_name'], 'school_id': representation['school']}
        representation.pop('school_name')
        return representation
    
    def validate(self, data):
        config = Settings.load()
        school = data['school']
        method = self.context['request'].method
        if len(data['members']) != len(set(data['members'])):
            raise serializers.ValidationError({'groupset': 'Duplicate members'})
        if len(data['members']) > 6:
            raise serializers.ValidationError({'groupset': 'Number of members cannot exceed 6'})
        if method == 'PUT' or method == 'PATCH':
            pass
        elif method == 'POST':
            for member in data['members']:
                if member.is_competitor and GroupsetMember.objects.filter(member=member, groupset__comp_year=config.reg_year).exists():
                    raise serializers.ValidationError({'groupset': 'Member is already in a groupset'})
                if member.school != school:
                    raise serializers.ValidationError({'groupset': 'Members must be from same school as groupset'})
            if Groupset.objects.filter(team_name=data['team_name'], comp_year=config.reg_year).exists():
                raise serializers.ValidationError({'groupset': 'A groupset with this name already exists'})
        return data
    
    def create(self, validated_data):
        members = validated_data.pop('members')
        leader = validated_data.pop('leader')
        groupset = Groupset.objects.create(**validated_data)
        for member in members:
            if member == leader:
                GroupsetMember.objects.create(member=member, groupset=groupset, leader=True)
            else:
                GroupsetMember.objects.create(member=member, groupset=groupset, leader=False)
        return groupset
    
    def update(self, instance, validated_data):
        old_members = list(instance.members.all())
        new_members = validated_data.pop('members', None)
        new_leader = validated_data.pop('leader', None)
        
        if instance.school != validated_data.get('school', instance.school):
            instance.school = validated_data['school']
            GroupsetMember.objects.filter(groupset=instance, member__in=old_members).delete()
            old_members = []
        
        instance.team_name = validated_data.get('team_name', instance.team_name)
        
        if new_members is not None:
            to_delete = set(old_members).difference(set(new_members))
            to_add = set(new_members).difference(set(old_members))

            if to_delete:
                GroupsetMember.objects.filter(groupset=instance, member__in=to_delete).delete()

            for member in to_add:
                is_leader = (new_leader is not None and member == new_leader)
                GroupsetMember.objects.create(member=member, groupset=instance, leader=is_leader)

            if new_leader is not None:
                GroupsetMember.objects.filter(groupset=instance, leader=True).update(leader=False)
                GroupsetMember.objects.filter(groupset=instance, member=new_leader).update(leader=True)
            
        instance.save()
        return instance

class OrganizerRegistrationSerializer(serializers.ModelSerializer):
    class InputSerializer(serializers.ModelSerializer):
        class Meta:
            model = Registration
            fields = ['event', 'nandu_str']
    registration = EventRegistrationSerializer(many=True, read_only=True)
    registration_input = InputSerializer(write_only=True, many=True)
    name = serializers.StringRelatedField(source='*')
    school = serializers.StringRelatedField()

    class Meta:
        model = User
        fields = ['user_id',
                  'name',
                  'email',
                  'gender',
                  'skill_level',
                  'school',
                  'student_type',
                  'grad_date',
                  'first_comp',
                  'registration',
                  'registration_input',
                  'is_competing', 
                  'has_paid',
                  'proof_of_reg']
        read_only_fields = ['user_id',
                     'name',
                     'email',
                     'gender',
                     'skill_level',
                     'school',
                     'student_type',
                     'grad_date',
                     'first_comp',
                     'registration']

    def validate(self, data):
        registration = data.get('registration_input', None)
        if registration is not None:
            events = [r['event'] for r in data['registration_input']]
            if len(events) != len(list(set(events))):
                raise serializers.ValidationError("No duplicate events")
        return data

    def update(self, instance, validated_data):
        year = validated_data.pop('comp_year')
        old_reg = list(instance.registration.filter(comp_year=year))
        new_reg = validated_data.pop('registration_input', None)
        

        if new_reg is not None:
            old_events = [r.event for r in old_reg]
            new_events = [r.get('event') for r in new_reg]
            
            to_delete = set(old_events).difference(set(new_events))
            to_add = set(new_events).difference(set(old_events))
            to_update = set(new_events).intersection(set(old_events))

            if to_delete:
                Registration.objects.filter(competitor=instance, event__in=to_delete, comp_year=year).delete()

            if to_add:
                create_list = []
                add = [r for r in new_reg if r['event'] in to_add]
                for reg in add:
                    create_list.append(Registration(competitor=instance, event=reg['event'], nandu_str=reg['nandu_str'], comp_year=year))
                Registration.objects.bulk_create(create_list)

            if to_update:
                changed = False
                update = [r for r in new_reg if r['event'] in to_update]
                update_dict = {item['event']: item['nandu_str'] for item in update}
                objs = Registration.objects.filter(competitor=instance, event__in=to_update, comp_year=year)
                for obj in objs:
                    if update_dict[obj.event] == "":
                        continue
                    obj.nandu_str = update_dict[obj.event]
                    changed = True
                if changed:
                    Registration.objects.bulk_update(objs, ['nandu_str'])

        return super().update(instance, validated_data)
