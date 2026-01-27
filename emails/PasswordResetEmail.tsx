import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
} from '@react-email/components'

interface PasswordResetEmailProps {
  code: string
}

export function PasswordResetEmail({ code }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={section}>
            <Heading style={heading}>Reset your password</Heading>
            <Text style={text}>
              Enter this code to reset your password:
            </Text>
            <Text style={codeStyle}>{code}</Text>
            <Text style={subtext}>
              This code expires in 10 minutes.
            </Text>
            <Text style={disclaimer}>
              If you didn't request this, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const body = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
}

const section = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px',
  textAlign: 'center' as const,
}

const heading = {
  color: '#18181b',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const text = {
  color: '#52525b',
  fontSize: '16px',
  margin: '0 0 24px',
}

const codeStyle = {
  backgroundColor: '#f4f4f5',
  borderRadius: '8px',
  color: '#18181b',
  display: 'inline-block',
  fontSize: '32px',
  fontWeight: '700',
  letterSpacing: '4px',
  margin: '0 0 24px',
  padding: '16px 32px',
}

const subtext = {
  color: '#a1a1aa',
  fontSize: '14px',
  margin: '0',
}

const disclaimer = {
  color: '#a1a1aa',
  fontSize: '14px',
  margin: '16px 0 0',
}

export default PasswordResetEmail
