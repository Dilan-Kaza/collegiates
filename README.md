# Collegiates Website

## Instructions for local dev:
1. create and install virtual environment
2. use pip to install packages specified in requirements.txt
3. navigate to backend directory
4. create .env using sample_env template, and populate with DB credentials and generate secret key using `from django.core.management.utils import get_random_secret_key \ print(get_random_secret_key())` and add to .env
5. do `python manage.py makemigrations` and `python manage.py migrate` to populate postgres db with tables
6. run server using `python manage.py runserver`

## Instructions for docker
1. navigate to backend directory
2. set .env using sample_env template, and populate with DB credentials and generate secret key using `from django.core.management.utils import get_random_secret_key \ print(get_random_secret_key())` and add to .env
3. run `docker compose up` (optional `-d` flag to hide output) server should run automatically and sync updates when changes are made
4. using `docker compose exec django-web` run `python manage.py makemigrations` and `python manage.py migrate` to populate postgres db with tables


