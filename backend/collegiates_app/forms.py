from .models import User, College
from django import forms
from django.contrib.auth.forms import UserCreationForm

class CreateUserForm(UserCreationForm):
    school = forms.ModelChoiceField(queryset=College.objects.all().order_by('college_name'))

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