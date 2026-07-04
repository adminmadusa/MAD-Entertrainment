'use server';

export async function submitContactForm(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const issueType = formData.get('issueType') as string;
    const bookingRef = formData.get('bookingRef') as string | null;
    const transactionId = formData.get('transactionId') as string | null;
    const message = formData.get('message') as string;

    if (!name || !email || !issueType || !message) {
      return { success: false, message: 'Please fill in all required fields.' };
    }

    // In a real application, you would send this to an email provider
    // like Resend, SendGrid, or save it to a database ticket system.
    // The email subject would be constructed as: `[${issueType.toUpperCase()}] ${name}`

    // Example of constructing the formatted body:
    /*
      Name: ${name}
      Email: ${email}
      Booking Reference: ${bookingRef || 'Not provided'}
      Transaction ID: ${transactionId || 'Not provided'}
      Issue Type: ${issueType}

      Message:
      ${message}
    */

    // Simulate network latency for UX
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return { success: true };
  } catch (error) {
    console.error('Failed to submit contact form:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
