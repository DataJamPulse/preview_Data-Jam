/**
 * Netlify Function: notify-lead
 * Sends email notification + pushes to HubSpot when a new lead is submitted
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const NOTIFY_EMAILS = ['arran@data-jam.com', 'rhea@data-jam.com'];

exports.handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    try {
        const lead = JSON.parse(event.body);
        const results = { email: false, hubspot: false };

        // Input validation - enforce length limits (defense in depth)
        if (lead.name && lead.name.length > 100) lead.name = lead.name.substring(0, 100);
        if (lead.email && lead.email.length > 254) lead.email = lead.email.substring(0, 254);
        if (lead.company && lead.company.length > 100) lead.company = lead.company.substring(0, 100);
        if (lead.message && lead.message.length > 2000) lead.message = lead.message.substring(0, 2000);
        if (lead.page_url && lead.page_url.length > 500) lead.page_url = lead.page_url.substring(0, 500);

        // Basic email validation
        if (!lead.email || !lead.email.includes('@')) {
            return { statusCode: 400, body: 'Invalid email' };
        }

        // 1. Send email notification via Resend
        if (RESEND_API_KEY) {
            try {
                const emailHtml = buildEmailHtml(lead);
                const emailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'Data Jam Leads <leads@data-jam.com>',
                        to: NOTIFY_EMAILS,
                        subject: `New Lead: ${lead.name} - ${formatInterest(lead.interest)}`,
                        html: emailHtml
                    })
                });
                results.email = emailResponse.ok;
                if (!emailResponse.ok) {
                    console.error('Resend error:', await emailResponse.text());
                }
            } catch (emailError) {
                console.error('Email error:', emailError);
            }
        }

        // 2. Push to HubSpot
        if (HUBSPOT_API_KEY) {
            try {
                const hubspotResponse = await createHubSpotContact(lead);
                results.hubspot = hubspotResponse.success;
            } catch (hubspotError) {
                console.error('HubSpot error:', hubspotError.message || hubspotError);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, results })
        };

    } catch (error) {
        console.error('Notification error:', error);
        return { statusCode: 500, body: 'Internal error' };
    }
};

/**
 * Create or update contact in HubSpot
 */
async function createHubSpotContact(lead) {
    // First, check if contact exists
    const searchResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/search`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filterGroups: [{
                    filters: [{
                        propertyName: 'email',
                        operator: 'EQ',
                        value: lead.email
                    }]
                }]
            })
        }
    );

    const searchData = await searchResponse.json();
    const existingContact = searchData.results?.[0];

    // Prepare contact properties
    const properties = {
        email: lead.email,
        firstname: lead.name?.split(' ')[0] || '',
        lastname: lead.name?.split(' ').slice(1).join(' ') || '',
        company: lead.company || '',
        lifecyclestage: 'lead',
        hs_lead_status: 'NEW'
    };

    // Marketing opt-in (custom property - needs to be created in HubSpot)
    if (typeof lead.marketing_optin === 'boolean') {
        properties.marketing_opt_in = lead.marketing_optin ? 'true' : 'false';
    }

    if (existingContact) {
        // Update existing contact
        const updateResponse = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${existingContact.id}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ properties })
            }
        );
        return {
            success: updateResponse.ok,
            action: 'updated'
        };
    } else {
        // Create new contact
        const createResponse = await fetch(
            'https://api.hubapi.com/crm/v3/objects/contacts',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ properties })
            }
        );
        return {
            success: createResponse.ok,
            action: 'created'
        };
    }
}

/**
 * Build HTML email content
 */
function buildEmailHtml(lead) {
    // Sanitize all user inputs to prevent HTML injection
    const safeName = escapeHtml(lead.name) || '-';
    const safeEmail = escapeHtml(lead.email) || '-';
    const safeCompany = escapeHtml(lead.company) || '-';
    const safeMessage = escapeHtml(lead.message) || '-';
    const safePageUrl = escapeHtml(lead.page_url) || 'data-jam.com';
    const marketingOptin = lead.marketing_optin ? 'Yes' : 'No';

    return `
        <h2>New Website Lead</h2>
        <p>A new lead has been submitted on data-jam.com</p>

        <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${safeName}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                <td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Company</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${safeCompany}</td>
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
                <td style="padding: 8px; border: 1px solid #ddd;">${safeMessage}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Marketing Opt-in</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${marketingOptin}</td>
            </tr>
        </table>

        <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Submitted from: ${safePageUrl}<br>
            Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}
        </p>
    `;
}

// Helper functions
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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
