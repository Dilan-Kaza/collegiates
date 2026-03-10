import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from django.contrib.postgres.functions import RandomUUID

class GenderChoices(models.TextChoices):
    MALE = 'M', 'Male'
    FEMALE = 'F', 'Female'


class StudentStatusChoices(models.TextChoices):
    UNDERGRADUATE = "1", "Full/Part-Time Undergraduate" 
    FT_GRADUATE = "2", "Full-Time Graduate/Professional School"
    EARLY_GRADUATE = "3", "Fall/Winter Graduates of Current Academic Year"
    NON_ENROLLED = "4", "Non-Enrolled Student"
    ONE_YR_ALUM = "5", "1yr Alumni"
    PT_GRADUATE = "6", "Part-Time Graduate/Professional School"
    ITL = "7", "International Student" 


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

class CustomUserManager(UserManager):
    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)          # uses default hashing
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        # ensure standard superuser flags
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        # prompt for custom required fields if not provided
        if "gender" not in extra_fields or not extra_fields.get("gender"):
            extra_fields["gender"] = input("Gender (M/F): ") or None
        if "student_type" not in extra_fields or not extra_fields.get("student_type"):
            extra_fields["student_type"] = input("Student status code (1-7): ") or None
        if "first_comp" not in extra_fields or not extra_fields.get("first_comp"):
            val = input("First competition year: ")
            extra_fields["first_comp"] = int(val) if val else None
        if "skill_level" not in extra_fields or not extra_fields.get("skill_level"):
            extra_fields["skill_level"] = input("Skill level (B/I/A): ") or None
        if "grad_date" not in extra_fields or not extra_fields.get("grad_date"):
            extra_fields["grad_date"] = input("Graduation date (YYYY-MM-DD): ") or None

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)
    
class User(AbstractUser):
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    gender = models.CharField(max_length=1, choices=GenderChoices.choices)
    school = models.ForeignKey(College, on_delete=models.SET_NULL, null=True, blank=True, db_column='school_id')
    student_type = models.CharField(max_length=1, choices=StudentStatusChoices.choices)
    first_comp = models.IntegerField()
    skill_level = models.CharField(max_length=1, choices=SkillLevelChoices.choices)
    grad_date = models.DateField()
    is_competing = models.BooleanField(default=False)
    has_paid = models.BooleanField(default=False)
    proof_of_reg = models.BooleanField(default=False)
    
    username = None
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = CustomUserManager()

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


class OrganizerAdmin(models.Model):
    admin_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admin_email = models.EmailField(unique=True)
    admin_password = models.BinaryField()
    
    class Meta:
        db_table = 'organizer_admin_account'


class Nandu(models.Model):
    competitor = models.ForeignKey(User, on_delete=models.CASCADE, db_column='competitor_id')
    comp_year = models.DateField()
    event = models.ForeignKey(Event, on_delete=models.CASCADE, db_column='event_code')
    nandu_str = models.TextField()
    date_created = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'nandu'
        unique_together = ('competitor', 'comp_year', 'event')
