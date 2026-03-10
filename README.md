# Collegiates Website

## Instructions for backend (local dev):
1. create and activate virtual environment
2. use pip to install packages specified in requirements.txt
3. navigate to backend directory
4. create .env using sample_env template, and populate with DB credentials and 
5. generate secret key using `from django.core.management.utils import get_random_secret_key \ print(get_random_secret_key())` and add to .env
6. do `python manage.py makemigrations` and `python manage.py migrate` to populate postgres db with tables
7. run server using `python manage.py runserver`

## Instructions for frontend (local dev):
I'll be honest, I don't remember how I got it working but basically something about installing node.js and running the development server with `npm run dev` theres a readme in /frontend
