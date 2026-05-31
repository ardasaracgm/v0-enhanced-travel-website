'use client'

import * as React from 'react'
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { saveContactRequest } from '@/lib/supabase'

interface ContactFormProps {
  className?: string
}

// `value` is the stable slug persisted to Supabase (locale-independent);
// `labelKey` resolves the displayed label under contactPage.form.subjects.
const subjects = [
  { value: 'ferry', labelKey: 'ferry' },
  { value: 'car-rental', labelKey: 'carRental' },
  { value: 'tours', labelKey: 'tours' },
  { value: 'visa', labelKey: 'visa' },
  { value: 'general', labelKey: 'general' },
  { value: 'complaint', labelKey: 'complaint' },
]

export function ContactForm({ className }: ContactFormProps) {
  const t = useTranslations('contactPage')
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setStatus('error')
      setErrorMessage(t('form.requiredError'))
      return
    }

    setStatus('submitting')

    const result = await saveContactRequest({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      // Persist the stable slug (locale-independent) — admin/DB stay canonical
      // regardless of the user's UI language.
      subject: formData.subject,
      message: formData.message,
    })

    if (result.success) {
      setStatus('success')
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    } else {
      setStatus('error')
      setErrorMessage(result.error || t('form.genericError'))
    }
  }

  if (status === 'success') {
    return (
      <div className={className}>
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800">{t('form.successTitle')}</AlertTitle>
          <AlertDescription className="text-green-700">
            {t('form.successBody')}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setStatus('idle')}
        >
          {t('form.sendAnother')}
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {status === 'error' && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('form.errorTitle')}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              {t('form.nameLabel')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder={t('form.namePlaceholder')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              {t('form.emailLabel')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground">
              {t('form.phoneLabel')}
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+90 5XX XXX XX XX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-foreground">
              {t('subjectLabel')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.subject}
              onValueChange={(value) => setFormData({ ...formData, subject: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('form.subjectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.value} value={subject.value}>
                    {t(`form.subjects.${subject.labelKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message" className="text-foreground">
            {t('messageLabel')} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="message"
            placeholder={t('form.messagePlaceholder')}
            rows={5}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            required
          />
        </div>

        <Button 
          type="submit" 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('form.submittingButton')}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {t('form.submitButton')}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
