from ..models import College, User, Settings, Registration, Event
from rest_framework.test import APITestCase
from rest_framework import status

def _make_settings(reg_year=2025, contact_email="test@example.com", host=College.objects.get(college_name="UC Los Angeles")):
    return Settings.objects.create(reg_year=reg_year, contact_email=contact_email, host=host)

def _make_competitor(email="competitor@example.com", password="StrongPass123!"):
    return User.objects.create_user(email=email, password=password)

class UserEventRegistrationTests(APITestCase):
    """
    Tests for POST register_events.
 
    The view should:
      - Return 404 when no Settings row exists.
      - Return 401/403 when the caller is not authenticated.
      - Return 400 for invalid/missing payload.
      - Return 400 for an empty list (no events selected).
      - Return 201 and create Registration rows on a valid payload.
      - Create the correct number of rows in the DB.
      - Attach the correct competitor, year, and event to each row.
      - Return 400 (serializer error) for a duplicate event in the same request.
    """
 
    URL = "/collegiates_app/register_events/"  # adjust to match your urls.py
    fixtures = ['schools.json', 'events.json']

    def setUp(self):
        self.user = _make_competitor()
        self.settings = _make_settings()
        self.client.force_authenticate(user=self.user)

    # bad D:
    def test_no_settings(self):
        Settings.objects.all().delete()
        response = self.client.post(self.URL, data=[{"event": "AMA101"}], format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)\
        
    def test_not_authenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(self.URL, data=[{"event": "AMA101"}], format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_invalid_payload(self):
        payloads = [{"invalid_field": "AMA101"}, # missing 'event' key
                   [{"event": "AMA101"}, {"event": "AMA101"}], # duplicate event
                   {"event": "NONEXISTENT"}, # event that doesn't exist
                   ] 
        for payload in payloads:
            response = self.client.post(self.URL, data=payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_already_registered_event(self):
        self.client.post(self.URL, data=[{"event": "AMA101"}], format='json')  # register for AMA101
        response = self.client.post(self.URL, data=[{"event": "AMA101"}], format='json')  # try to register again
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # good :D
    def test_register_single_event(self):
        response = self.client.post(self.URL, data=[{"event": "AMA101"}], format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['detail'], "Successfully registered for 1 event(s).")

    
    def test_register_multiple_events(self):
        response = self.client.post(self.URL, data=[{"event": "AMA101"}, {"event": "AMA121"}], format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['detail'], "Successfully registered for 2 event(s).")    