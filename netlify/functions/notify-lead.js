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
                        from: 'Data Jam <hello@data-jam.com>',
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
                if (!hubspotResponse.success) {
                    console.error('HubSpot error:', hubspotResponse.error);
                }
            } catch (hubspotError) {
                console.error('HubSpot error:', hubspotError);
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
        lead_source: 'Website Form',
        lifecyclestage: 'lead',
        website_form_type: formatType(lead.type),
        website_form_interest: formatInterest(lead.interest),
        website_form_message: lead.message || ''
    };

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
            action: 'updated',
            error: updateResponse.ok ? null : await updateResponse.text()
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
            action: 'created',
            error: createResponse.ok ? null : await createResponse.text()
        };
    }
}

/**
 * Build HTML email content
 */
function buildEmailHtml(lead) {
    return `
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
}

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
