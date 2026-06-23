"""
Tests for password recovery views in user_views.py:
  - reset_password_link  (POST)
  - reset_password_confirm (POST)

Testing approach:
  - Django's test runner automatically swaps in the locmem email backend, so
    mail.outbox is available without any @override_settings decorator.
    Ref: https://docs.djangoproject.com/en/5.2/topics/email/#in-memory-backend
  - DRF's APIClient / APITestCase is used for all HTTP calls.
    Ref: https://www.django-rest-framework.org/api-guide/testing/
  - mail.outbox is reset to [] at the start of every TestCase test method
    automatically by Django.
    Ref: https://docs.djangoproject.com/en/5.2/topics/testing/tools/#email-services
"""

from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from rest_framework import status
from rest_framework.test import APITestCase

from ..models import User  # adjust import path to match your project layout


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(email="test@example.com", password="StrongPass123!"):
    """Create and return a saved User with the given credentials."""
    user = User.objects.create_user(email=email, password=password)
    return user


def _uid_and_token(user):
    """Return the base64-encoded uid and a fresh token for a user."""
    uid = urlsafe_base64_encode(force_bytes(user.user_id))
    token = default_token_generator.make_token(user)
    return uid, token


# ---------------------------------------------------------------------------
# reset_password_link  (POST /api/reset-password-link/)
# ---------------------------------------------------------------------------

class ResetPasswordLinkTests(APITestCase):
    """
    Tests for the reset_password_link view.

    The view should:
      - Always return HTTP 200 with {"success": True} (even for unknown emails)
        to avoid leaking which addresses are registered.
      - Send exactly one email to a known address.
      - Send no email for an unknown address.
      - Include the uid and token in the email body.
    """

    URL = "/collegiates_app/reset-password/"  # adjust to your urls.py

    def setUp(self):
        self.user = _make_user()

    # --- happy path ---

    def test_returns_200_for_known_email(self):
        response = self.client.post(self.URL, {"email": self.user.email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

    def test_sends_one_email_for_known_address(self):
        self.client.post(self.URL, {"email": self.user.email}, format="json")
        self.assertEqual(len(mail.outbox), 1)

    def test_email_sent_to_correct_recipient(self):
        self.client.post(self.URL, {"email": self.user.email}, format="json")
        self.assertIn(self.user.email, mail.outbox[0].to)

    def test_email_subject_contains_reset(self):
        self.client.post(self.URL, {"email": self.user.email}, format="json")
        self.assertIn("Password Reset", mail.outbox[0].subject)

    def test_email_body_contains_reset_link(self):
        self.client.post(self.URL, {"email": self.user.email}, format="json")
        body = mail.outbox[0].body
        self.assertIn("reset-password", body)

    def test_email_body_contains_uid(self):
        self.client.post(self.URL, {"email": self.user.email}, format="json")
        uid = urlsafe_base64_encode(force_bytes(self.user.user_id))
        self.assertIn(uid, mail.outbox[0].body)

    def test_email_body_contains_token(self):
        """
        We can't predict the exact token, but we can verify that the body
        contains a 'token=' query-param fragment.
        """
        self.client.post(self.URL, {"email": self.user.email}, format="json")
        self.assertIn("token=", mail.outbox[0].body)

    def test_email_from_address(self):
        self.client.post(self.URL, {"email": self.user.email}, format="json")
        self.assertEqual(mail.outbox[0].from_email, "noreply@collegiatewushu.com")

    # --- case-insensitive email lookup ---

    def test_case_insensitive_email_lookup(self):
        """The view uses email__iexact, so mixed-case should still find the user."""
        self.client.post(self.URL, {"email": self.user.email.upper()}, format="json")
        self.assertEqual(len(mail.outbox), 1)

    # --- unknown email (security: don't leak existence) ---

    def test_returns_200_for_unknown_email(self):
        """
        The view silently ignores unknown emails to avoid user-enumeration
        attacks, and still returns {"success": True}.
        """
        response = self.client.post(self.URL, {"email": "nobody@nowhere.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

    def test_no_email_sent_for_unknown_address(self):
        self.client.post(self.URL, {"email": "nobody@nowhere.com"}, format="json")
        self.assertEqual(len(mail.outbox), 0)

    # --- only one email per request (no duplicate sends) ---

    def test_single_request_sends_exactly_one_email(self):
        self.client.post(self.URL, {"email": self.user.email}, format="json")
        self.client.post(self.URL, {"email": self.user.email}, format="json")
        self.assertEqual(len(mail.outbox), 2)  # two requests → two emails, not one or three


# ---------------------------------------------------------------------------
# reset_password_confirm  (POST /api/reset-password-confirm/)
# ---------------------------------------------------------------------------

class ResetPasswordConfirmTests(APITestCase):
    """
    Tests for the reset_password_confirm view.

    The view should:
      - Set a new password when uid + token are valid.
      - Return HTTP 400 for a tampered / invalid uid.
      - Return HTTP 400 when the user does not exist.
      - Return HTTP 400 when the token has already been used or is wrong.
      - Return HTTP 400 for a completely garbled uid.
      - Allow the user to authenticate with the new password afterwards.
    """

    URL = "/collegiates_app/reset-password-confirm/"  # adjust to your urls.py

    def setUp(self):
        self.user = _make_user(email="confirm@example.com", password="OldPass999!")
        self.uid, self.token = _uid_and_token(self.user)

    # --- happy path ---

    def test_returns_200_with_valid_uid_and_token(self):
        response = self.client.post(
            self.URL,
            {"uid": self.uid, "token": self.token, "password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

    def test_password_is_actually_changed(self):
        new_password = "NewPass456!"
        self.client.post(
            self.URL,
            {"uid": self.uid, "token": self.token, "password": new_password},
            format="json",
        )
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))

    def test_old_password_no_longer_works_after_reset(self):
        self.client.post(
            self.URL,
            {"uid": self.uid, "token": self.token, "password": "NewPass456!"},
            format="json",
        )
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password("OldPass999!"))

    # --- token reuse (replay attack) ---

    def test_token_cannot_be_reused(self):
        """
        Django's PasswordResetTokenGenerator invalidates a token once the
        user's password (or last-login) changes.
        """
        self.client.post(
            self.URL,
            {"uid": self.uid, "token": self.token, "password": "FirstReset1!"},
            format="json",
        )
        # Re-generate uid/token snapshot is stale; second use should fail
        response = self.client.post(
            self.URL,
            {"uid": self.uid, "token": self.token, "password": "SecondReset2!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    # --- invalid token ---

    def test_returns_400_for_wrong_token(self):
        response = self.client.post(
            self.URL,
            {"uid": self.uid, "token": "totally-wrong-token", "password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_returns_400_for_empty_token(self):
        response = self.client.post(
            self.URL,
            {"uid": self.uid, "token": "", "password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- invalid / tampered uid ---

    def test_returns_400_for_nonexistent_user_uid(self):
        """A uid that decodes to a user_id that doesn't exist in the DB."""
        fake_uid = urlsafe_base64_encode(force_bytes("00000000-0000-0000-0000-000000000000"))
        response = self.client.post(
            self.URL,
            {"uid": fake_uid, "token": self.token, "password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_returns_400_for_garbled_uid(self):
        """A uid that can't be decoded at all (ValueError path)."""
        response = self.client.post(
            self.URL,
            {"uid": "!!!not-valid-base64!!!", "token": self.token, "password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_returns_400_for_empty_uid(self):
        response = self.client.post(
            self.URL,
            {"uid": "", "token": self.token, "password": "NewPass456!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)


    # --- token belongs to a different user ---

    def test_token_from_different_user_is_rejected(self):
        """A valid token for user A must not reset user B's password."""
        other_user = _make_user(email="other@example.com", password="OtherPass1!")
        _, other_token = _uid_and_token(other_user)

        response = self.client.post(
            self.URL,
            # uid → self.user, but token was generated for other_user
            {"uid": self.uid, "token": other_token, "password": "Hacked123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- password is not changed on failure ---

    def test_password_unchanged_after_bad_token(self):
        self.client.post(
            self.URL,
            {"uid": self.uid, "token": "bad-token", "password": "NewPass456!"},
            format="json",
        )
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass999!"))

    def test_password_unchanged_after_bad_uid(self):
        fake_uid = urlsafe_base64_encode(force_bytes("00000000-0000-0000-0000-000000000000"))
        self.client.post(
            self.URL,
            {"uid": fake_uid, "token": self.token, "password": "NewPass456!"},
            format="json",
        )
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass999!"))