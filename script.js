document.addEventListener('DOMContentLoaded', () => {
    // Custom radio button styling and conditional UI logic
    const radioGroups = document.querySelectorAll('.radio-group');
    const mealSection = document.getElementById('meal-section');
    const formError = document.getElementById('form-error');
    const submitBtn = document.getElementById('submit-btn');
    const form = document.getElementById('rsvp-form');
    const modal = document.getElementById('success-modal');
    const closeModalBtn = document.getElementById('close-modal');

    // Helper for API endpoint
    const getApiUrl = (endpoint) => {
        const base = window.API_BASE_URL || '';
        return `${base}${endpoint}`;
    };

    radioGroups.forEach(group => {
        const labels = group.querySelectorAll('.radio-btn');
        
        labels.forEach(label => {
            const input = label.querySelector('input[type="radio"]');
            
            // Initial state
            if (input.checked) {
                label.classList.add('active');
            }
            
            // Change handler
            input.addEventListener('change', () => {
                labels.forEach(l => l.classList.remove('active'));
                
                if (input.checked) {
                    label.classList.add('active');
                }

                // If attending radio changed, toggle meal section visibility
                if (input.name === 'attending') {
                    if (input.value === 'no') {
                        if (mealSection) mealSection.style.display = 'none';
                    } else {
                        if (mealSection) mealSection.style.display = 'flex';
                    }
                }
            });
        });
    });

    // Form Submission Handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            if (formError) {
                formError.style.display = 'none';
                formError.textContent = '';
            }

            const fullNameEl = document.getElementById('fullName');
            const whatsappEl = document.getElementById('whatsapp');
            const dietaryEl = document.getElementById('dietary');
            const messageEl = document.getElementById('message');

            const fullName = fullNameEl ? fullNameEl.value.trim() : '';
            const whatsapp = whatsappEl ? whatsappEl.value.trim() : '';
            const attendingInput = document.querySelector('input[name="attending"]:checked');
            const attending = attendingInput ? attendingInput.value : 'yes';
            const plateInput = document.querySelector('input[name="plate"]:checked');
            const plate = plateInput ? plateInput.value : 'beef';
            const dietary = dietaryEl ? dietaryEl.value.trim() : '';
            const message = messageEl ? messageEl.value.trim() : '';

            // Validation
            if (!fullName || fullName.length < 2) {
                showError('Please enter your full name.');
                return;
            }

            if (!whatsapp || whatsapp.length < 8) {
                showError('Please enter a valid WhatsApp or mobile number.');
                return;
            }

            const payload = {
                fullName,
                whatsapp,
                attending,
                plate: attending === 'yes' ? plate : null,
                dietary,
                message
            };

            // Loading state
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Recording your RSVP...';

            let res;
            try {
                res = await fetch(getApiUrl('/api/submit'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            } catch (networkErr) {
                throw new Error('Network error. Please check your internet connection and try again.');
            }

            let result = {};
            try {
                result = await res.json();
            } catch (jsonErr) {
                if (!res.ok) {
                    throw new Error('Server error occurred. Please try again later.');
                }
            }

            if (!res?.ok) {
                throw new Error(result.error || 'Failed to submit RSVP. Please try again.');
            }

            // Success modal
            if (modal) modal.classList.remove('hidden');
        } catch (err) {
            console.error('RSVP submission error:', err);
            showError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                // Only reset text if we changed it to the loading state
                if (submitBtn.textContent === '⏳ Recording your RSVP...') {
                    submitBtn.textContent = '🎀 SEND MY RSVP ♥';
                }
            }
        }
    });

    function showError(msg) {
        if (formError) {
            formError.textContent = msg;
            formError.style.display = 'block';
        } else {
            alert(msg);
        }
    }

    // Modal Close
    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        form.reset();
        
        // Reset radio buttons to default state
        radioGroups.forEach(group => {
            const labels = group.querySelectorAll('.radio-btn');
            labels.forEach((l, index) => {
                const input = l.querySelector('input');
                if (index === 0) {
                    input.checked = true;
                    l.classList.add('active');
                } else {
                    input.checked = false;
                    l.classList.remove('active');
                }
            });
        });

        // Ensure meal section is visible again
        if (mealSection) mealSection.style.display = 'flex';
    });
});
