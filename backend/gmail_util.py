import os.path
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_gmail_service():
    """
    Handles OAuth2 authentication and returns a Gmail API service instance.
    Supports loading from files (local) or environment variables (live/Render).
    """
    import json
    creds = None
    basedir = os.path.abspath(os.path.dirname(__file__))
    token_path = os.path.join(basedir, 'token.json')
    secret_path = os.path.join(basedir, 'client_secret.json')

    # 1. Try loading Token from Env Var (Primary for Render)
    env_token = os.environ.get('GOOGLE_TOKEN_JSON')
    if env_token:
        try:
            creds = Credentials.from_authorized_user_info(json.loads(env_token), SCOPES)
            print("INFO: Loaded Gmail token from environment variable.")
        except Exception as e:
            print(f"WARNING: Failed to load token from environment: {e}")

    # 2. Fallback to token.json file
    if not creds and os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    # Check if credentials exist and are valid
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("INFO: Refreshing Gmail access token...")
            creds.refresh(Request())
        else:
            # 3. Handle Client Secret (Env or File)
            env_secret = os.environ.get('GOOGLE_CLIENT_SECRET_JSON')
            
            if env_secret:
                try:
                    secret_info = json.loads(env_secret)
                    flow = InstalledAppFlow.from_client_config(secret_info, SCOPES)
                    print("INFO: Loaded Gmail client secret from environment variable.")
                except Exception as e:
                    raise ValueError(f"Invalid GOOGLE_CLIENT_SECRET_JSON environment variable: {e}")
            elif os.path.exists(secret_path):
                flow = InstalledAppFlow.from_client_secrets_file(secret_path, SCOPES)
            else:
                raise FileNotFoundError("Missing Google API credentials (both Env Var and File).")
                
            # If we reach here, we need a fresh authorization
            # This only works locally where a browser can open
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for next time (locally)
        # Note: In Render, this file will be ephemeral, but we should have the Env Var anyway
        with open(token_path, 'w') as token:
            token.write(creds.to_json())

    return build('gmail', 'v1', credentials=creds)

def send_gmail(recipient, subject, body_html, attachments=None):
    """
    Sends an email using the Gmail API.
    attachments: list of dicts {"filename": str, "content": bytes}
    """
    try:
        service = get_gmail_service()
        message = MIMEMultipart()
        message['to'] = recipient
        message['subject'] = subject
        message["from"] = "BulkBins Reports <monica3214b@gmail.com>" # To update email sender name
        
        # Add HTML body
        msg_html = MIMEText(body_html, 'html')
        message.attach(msg_html)

        # Add attachments if any
        if attachments:
            for attr in attachments:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attr['content'])
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename="{attr["filename"]}"'
                )
                message.attach(part)

        # Gmail API requires the raw MIME message to be base64url encoded
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        sent_message = service.users().messages().send(
            userId="me",
            body={'raw': raw_message}
        ).execute()
        
        print(f"✅ Email sent successfully via Gmail API. Message ID: {sent_message['id']}")
        return sent_message
    except Exception as error:
        print(f"❌ Error sending email via Gmail API: {error}")
        raise error
