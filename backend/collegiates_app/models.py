import uuid
from django.db import models

class GenderChoices(models.TextChoices):
    MALE = 'M', 'Male'
    FEMALE = 'F', 'Female'


class StudentTypeChoices(models.TextChoices):
    UNDERGRADUATE = 'U', 'Undergraduate'
    GRADUATE = 'G', 'Graduate'


class SkillLevelChoices(models.TextChoices):
    BEGINNER = 'B', 'Beginner'
    INTERMEDIATE = 'I', 'Intermediate'
    ADVANCED = 'A', 'Advanced'


class College(models.Model):
    college_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    college_name = models.CharField(max_length=255, unique=True)
    
    def __str__(self):
        return self.college_name
    
    class Meta:
        db_table = 'colleges'


class User(models.Model):
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    password_hash = models.BinaryField()  # Store as Binary in Django
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    gender = models.CharField(max_length=1, choices=GenderChoices.choices)
    school = models.ForeignKey(College, on_delete=models.SET_NULL, null=True, blank=True, db_column='school_id')
    student_type = models.CharField(max_length=1, choices=StudentTypeChoices.choices)
    first_comp = models.DateField()
    undergrad_year = models.IntegerField(null=True, blank=True)
    skill_level = models.CharField(max_length=1, choices=SkillLevelChoices.choices)
    grad_date = models.DateField()
    is_competing = models.BooleanField(default=False)
    has_paid = models.BooleanField(default=False)
    proof_of_reg = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    class Meta:
        db_table = 'users'


class Event(models.Model):
    event_code = models.CharField(primary_key=True, max_length=50)
    event_name = models.CharField(max_length=255, unique=True)
    event_level = models.CharField(max_length=1, choices=SkillLevelChoices.choices)
    gender_category = models.CharField(max_length=1, choices=GenderChoices.choices)
    is_nandu = models.BooleanField()
    
    def __str__(self):
        return self.event_name
    
    class Meta:
        db_table = 'events'


class Registration(models.Model):
    competitor = models.ForeignKey(User, on_delete=models.CASCADE, db_column='competitor_id')
    comp_year = models.DateField()
    event = models.ForeignKey(Event, on_delete=models.CASCADE, db_column='event_code')
    date_created = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'registration'
        unique_together = ('competitor', 'comp_year', 'event')


class Groupset(models.Model):
    groupset_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    comp_year = models.DateField()
    school = models.ForeignKey(College, on_delete=models.CASCADE, db_column='school_id')
    team_leader = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                     related_name='led_groupsets', db_column='team_leader')
    member_2 = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                  related_name='groupset_member_2', db_column='member_2')
    member_3 = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                  related_name='groupset_member_3', db_column='member_3')
    member_4 = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                  related_name='groupset_member_4', db_column='member_4')
    member_5 = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                  related_name='groupset_member_5', db_column='member_5')
    member_6 = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                  related_name='groupset_member_6', db_column='member_6')
    date_created = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'groupset'


class Blog(models.Model):
    blog_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date_created = models.DateTimeField(auto_now_add=True)
    author = models.CharField(max_length=255)
    category = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    blog_content = models.TextField()
    
    def __str__(self):
        return self.title
    
    class Meta:
        db_table = 'blog'


class Admin(models.Model):
    admin_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admin_user = models.CharField(max_length=255, unique=True)
    admin_password = models.BinaryField()
    
    class Meta:
        db_table = 'admin_account'


class Nandu(models.Model):
    competitor = models.ForeignKey(User, on_delete=models.CASCADE, db_column='competitor_id')
    comp_year = models.DateField()
    event = models.ForeignKey(Event, on_delete=models.CASCADE, db_column='event_code')
    nandu_str = models.TextField()
    date_created = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'nandu'
        unique_together = ('competitor', 'comp_year', 'event')
