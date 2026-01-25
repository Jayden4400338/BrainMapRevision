        (async function checkAuth() {
            try {
                const { data: { session }, error } = await window.supabaseClient.auth.getSession();
                
                if (error) throw error;
                
                if (!session) {
                   
                    window.location.href = '../auth/login.html';
                    return;
                }
                
                
            } catch (error) {
              
                window.location.href = '../auth/login.html';
            }
        })();

