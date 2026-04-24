from __future__ import annotations

import json
import smtplib
from email.message import EmailMessage
from urllib import parse, request

from app.core.config import get_settings
from app.schemas.alerts import AlertRecord


class NotificationService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def dispatch_alert(self, alert: AlertRecord) -> dict[str, bool]:
        return {
            "email": self._send_email(alert),
            "telegram": self._send_telegram(alert),
        }

    def _send_email(self, alert: AlertRecord) -> bool:
        if (
            not self.settings.smtp_host
            or not self.settings.smtp_user
            or not self.settings.smtp_password
            or not self.settings.alert_email_to
        ):
            return False

        sender = self.settings.alert_email_from or self.settings.smtp_user
        recipients = [value.strip() for value in self.settings.alert_email_to.split(",") if value.strip()]
        if not recipients:
            return False

        message = EmailMessage()
        message["Subject"] = f"[LogGuardian] {alert.priority.upper()} - {alert.title}"
        message["From"] = sender
        message["To"] = ", ".join(recipients)
        message.set_content(
            "\n".join(
                [
                    f"Service: {alert.service}",
                    f"Classification: {alert.classification}",
                    f"Priority: {alert.priority}",
                    f"Occurrences: {alert.occurrence_count}",
                    "",
                    alert.message,
                ]
            )
        )

        try:
            with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port, timeout=10) as client:
                client.starttls()
                client.login(self.settings.smtp_user, self.settings.smtp_password)
                client.send_message(message)
            return True
        except Exception:
            return False

    def _send_telegram(self, alert: AlertRecord) -> bool:
        if not self.settings.telegram_bot_token or not self.settings.telegram_chat_id:
            return False

        text = (
            f"[LogGuardian] {alert.priority.upper()}\n"
            f"Service: {alert.service}\n"
            f"Class: {alert.classification}\n"
            f"Occurrences: {alert.occurrence_count}\n"
            f"Message: {alert.message[:700]}"
        )

        body = parse.urlencode(
            {
                "chat_id": self.settings.telegram_chat_id,
                "text": text,
            }
        ).encode("utf-8")

        endpoint = (
            f"https://api.telegram.org/bot{self.settings.telegram_bot_token}/sendMessage"
        )

        try:
            req = request.Request(
                endpoint,
                data=body,
                method="POST",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            with request.urlopen(req, timeout=10) as response:
                payload = json.loads(response.read().decode("utf-8"))
                return bool(payload.get("ok"))
        except Exception:
            return False
