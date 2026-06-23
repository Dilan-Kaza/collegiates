# Register your models here.
from .models import Blog, College, Event, User, Registration, Groupset, Settings

from django.contrib import admin

admin.site.register(Blog)
admin.site.register(College)
admin.site.register(Event)
admin.site.register(Registration)
admin.site.register(Groupset)
admin.site.register(Settings)
admin.site.register(User)