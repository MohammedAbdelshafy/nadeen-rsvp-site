document.addEventListener('DOMContentLoaded', () => {
    // Handle custom radio button styling
    const radioGroups = document.querySelectorAll('.radio-group');
    
    radioGroups.forEach(group => {
        const labels = group.querySelectorAll('.radio-btn');
        
        labels.forEach(label => {
            const input = label.querySelector('input[type="radio"]');
            
            // Initial state
            if (input.checked) {
                label.classList.add('active');
            }
            
            // Click handler
            input.addEventListener('change', () => {
                // Remove active class from all labels in this group
                labels.forEach(l => l.classList.remove('active'));
                
                // Add active class to selected
                if (input.checked) {
                    label.classList.add('active');
                }
            });
        });
    });

    // Form Submission
    const form = document.getElementById('rsvp-form');
    const modal = document.getElementById('success-modal');
    const closeModalBtn = document.getElementById('close-modal');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // In a real application, you would send the data to a server here
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.fullName = document.getElementById('fullName').value;
        data.whatsapp = document.getElementById('whatsapp').value;
        data.dietary = document.getElementById('dietary').value;
        data.message = document.getElementById('message').value;
        
        console.log('RSVP Data Submitted:', data);
        
        // Show success modal
        modal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        form.reset();
        
        // Reset custom radio buttons to initial state (first option selected)
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
    });
});
