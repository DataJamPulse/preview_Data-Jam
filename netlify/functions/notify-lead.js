/**
 * Netlify Function: notify-lead
 * Sends email notification when a new lead is submitted
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAILS = ['arran@data-jam.com', 'rhea@data-jam.com'];

exports.handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    // Check API key is configured
    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured');
        return { statusCode: 500, body: 'Email service not configured' };
    }

    try {
        const lead = JSON.parse(event.body);

        // Build email content
        const emailHtml = `
            <h2>New Website Lead</h2>
            <p>A new lead has been submitted on data-jam.com</p>

            <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${lead.name || '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                    <td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${lead.email}">${lead.email || '-'}</a></td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Company</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${lead.company || '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Type</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${formatType(lead.type)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Interest</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${formatInterest(lead.interest)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Message</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${lead.message || '-'}</td>
                </tr>
            </table>

            <p style="margin-top: 20px; color: #666; font-size: 12px;">
                Submitted from: ${lead.page_url || 'data-jam.com'}<br>
                Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}
            </p>
        `;

        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Data Jam <notifications@data-jam.com>',
                to: NOTIFY_EMAILS,
                subject: `New Lead: ${lead.name} - ${formatInterest(lead.interest)}`,
                html: emailHtml
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Resend error:', error);
            return { statusCode: 500, body: 'Failed to send notification' };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Notification error:', error);
        return { statusCode: 500, body: 'Internal error' };
    }
};

// Helper functions
function formatType(type) {
    const types = {
        'media-owner': 'OOH Media Owner',
        'agency': 'Advertising Agency',
        'brand': 'Brand / Advertiser',
        'dooh': 'DOOH Operator',
        'other': 'Other'
    };
    return types[type] || type || '-';
}

function formatInterest(interest) {
    const interests = {
        'demo': 'JamBox Demo',
        'pricing': 'Pricing Information',
        'partnership': 'Partnership Opportunities',
        'technical': 'Technical Questions',
        'general': 'General Enquiry'
    };
    return interests[interest] || interest || '-';
}
