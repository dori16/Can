import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configurazione - Supporta sia i nomi standard che quelli di Vite
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ ERRORE: Mancano i dati necessari.');
  
  if (!supabaseUrl) {
    console.error('   - Manca SUPABASE_URL (o VITE_PUBLIC_SUPABASE_URL)');
  }
  if (!supabaseServiceRoleKey) {
    console.error('   - Manca SUPABASE_SERVICE_ROLE_KEY');
    console.error('\n⚠️  ATTENZIONE: Non puoi usare la ANON_KEY per questa operazione.');
    console.error('   La ANON_KEY non ha i permessi per modificare altri utenti.');
    console.error('   Devi usare la "service_role" key che trovi in Supabase -> Settings -> API.');
  }

  console.log('\nPer risolvere, aggiungi questo al tuo file .env:');
  console.log(`SUPABASE_SERVICE_ROLE_KEY=la_tua_chiave_segreta_service_role`);
  console.log('\nPoi riprova: npx tsx fix-emails.ts');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateEmails() {
  console.log('🚀 Inizio aggiornamento email...');
  
  let page = 1;
  const perPage = 50;
  let allUsers: any[] = [];
  let hasMore = true;

  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: perPage
    });

    if (error) {
      console.error('Errore durante il recupero degli utenti:', error);
      return;
    }

    allUsers = allUsers.concat(users);
    
    if (users.length < perPage) {
      hasMore = false;
    } else {
      page++;
    }
  }

  const usersToUpdate = allUsers.filter(u => u.email?.endsWith('@cac.it'));
  
  console.log(`📊 Totale utenti trovati: ${allUsers.length}`);
  console.log(`🎯 Utenti da aggiornare (@cac.it -> @can.it): ${usersToUpdate.length}`);

  if (usersToUpdate.length === 0) {
    console.log('✅ Nessun utente da aggiornare.');
    return;
  }

  for (const user of usersToUpdate) {
    const oldEmail = user.email;
    const newEmail = oldEmail.replace('@cac.it', '@can.it');
    
    console.log(`🔄 Aggiornamento: ${oldEmail} ➡️ ${newEmail}...`);
    
    // updateByAdmin bypassa la conferma email se configurato correttamente
    // email_confirm: true segna l'email come confermata immediatamente
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        email: newEmail,
        email_confirm: true 
      }
    );

    if (updateError) {
      console.error(`❌ Errore per ${oldEmail}:`, updateError.message);
    } else {
      console.log(`✨ Successo: ${oldEmail} aggiornato.`);
    }
  }

  console.log('\n✅ Operazione completata!');
}

updateEmails();
