export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      apptexts: {
        Row: {
          customtext: string | null
          defaulttext: string | null
          key: string
          page: string
        }
        Insert: {
          customtext?: string | null
          defaulttext?: string | null
          key: string
          page: string
        }
        Update: {
          customtext?: string | null
          defaulttext?: string | null
          key?: string
          page?: string
        }
        Relationships: []
      }
      batchrun: {
        Row: {
          appversion: string | null
          clubparticipation: number | null
          comment: string | null
          endtime: string | null
          id: string
          initiatedby: string | null
          numberoferrors: number | null
          numberofrequests: number | null
          numberofrowsafter: number | null
          numberofrowsbefore: number | null
          renderjobid: string | null
          starttime: string | null
          status: string | null
        }
        Insert: {
          appversion?: string | null
          clubparticipation?: number | null
          comment?: string | null
          endtime?: string | null
          id?: string
          initiatedby?: string | null
          numberoferrors?: number | null
          numberofrequests?: number | null
          numberofrowsafter?: number | null
          numberofrowsbefore?: number | null
          renderjobid?: string | null
          starttime?: string | null
          status?: string | null
        }
        Update: {
          appversion?: string | null
          clubparticipation?: number | null
          comment?: string | null
          endtime?: string | null
          id?: string
          initiatedby?: string | null
          numberoferrors?: number | null
          numberofrequests?: number | null
          numberofrowsafter?: number | null
          numberofrowsbefore?: number | null
          renderjobid?: string | null
          starttime?: string | null
          status?: string | null
        }
        Relationships: []
      }
      clubs: {
        Row: {
          apikey: string | null
          clubname: string | null
          organisationid: number
        }
        Insert: {
          apikey?: string | null
          clubname?: string | null
          organisationid: number
        }
        Update: {
          apikey?: string | null
          clubname?: string | null
          organisationid?: number
        }
        Relationships: []
      }
      eventorclubs: {
        Row: {
          clubname: string
          organisationid: number
        }
        Insert: {
          clubname: string
          organisationid: number
        }
        Update: {
          clubname?: string
          organisationid?: number
        }
        Relationships: []
      }
      events: {
        Row: {
          batchid: string | null
          disciplineid: number | null
          eventclassificationid: number | null
          eventdate: string | null
          eventdistance: string | null
          eventform: string | null
          eventid: number | null
          eventname: string | null
          eventorganiser: string | null
          eventorganiser_ids: string | null
          eventraceid: number
          eventyear: number | null
          readonly: number | null
        }
        Insert: {
          batchid?: string | null
          disciplineid?: number | null
          eventclassificationid?: number | null
          eventdate?: string | null
          eventdistance?: string | null
          eventform?: string | null
          eventid?: number | null
          eventname?: string | null
          eventorganiser?: string | null
          eventorganiser_ids?: string | null
          eventraceid: number
          eventyear?: number | null
          readonly?: number | null
        }
        Update: {
          batchid?: string | null
          disciplineid?: number | null
          eventclassificationid?: number | null
          eventdate?: string | null
          eventdistance?: string | null
          eventform?: string | null
          eventid?: number | null
          eventname?: string | null
          eventorganiser?: string | null
          eventorganiser_ids?: string | null
          eventraceid?: number
          eventyear?: number | null
          readonly?: number | null
        }
        Relationships: []
      }
      logdata: {
        Row: {
          batchid: string | null
          comment: string | null
          completed: string | null
          errormessage: string | null
          eventid: number | null
          id: string
          level: string | null
          organisationid: number | null
          request: string | null
          responsecode: string | null
          source: string | null
          started: string | null
          timestamp: string | null
        }
        Insert: {
          batchid?: string | null
          comment?: string | null
          completed?: string | null
          errormessage?: string | null
          eventid?: number | null
          id?: string
          level?: string | null
          organisationid?: number | null
          request?: string | null
          responsecode?: string | null
          source?: string | null
          started?: string | null
          timestamp?: string | null
        }
        Update: {
          batchid?: string | null
          comment?: string | null
          completed?: string | null
          errormessage?: string | null
          eventid?: number | null
          id?: string
          level?: string | null
          organisationid?: number | null
          request?: string | null
          responsecode?: string | null
          source?: string | null
          started?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      persons: {
        Row: {
          batchid: string | null
          eventormodifydate: string | null
          organisationid: number
          personbirthdate: string | null
          personid: number
          personnamefamily: string | null
          personnamegiven: string | null
          personsex: string | null
        }
        Insert: {
          batchid?: string | null
          eventormodifydate?: string | null
          organisationid: number
          personbirthdate?: string | null
          personid: number
          personnamefamily?: string | null
          personnamegiven?: string | null
          personsex?: string | null
        }
        Update: {
          batchid?: string | null
          eventormodifydate?: string | null
          organisationid?: number
          personbirthdate?: string | null
          personid?: number
          personnamefamily?: string | null
          personnamegiven?: string | null
          personsex?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          batchid: string | null
          classresultnumberofstarts: number | null
          classtypeid: number | null
          clubparticipation: number | null
          countnopoints: number | null
          eventclassname: string | null
          eventid: number | null
          eventraceid: number
          id: number
          klassfaktor: number | null
          personage: number | null
          personid: number
          points: number | null
          readonly: number | null
          relayleg: number | null
          relaylegoverallposition: number | null
          relayteamenddiff: number | null
          relayteamendposition: number | null
          relayteamendstatus: string | null
          relayteamname: string | null
          resultcompetitorstatus: string | null
          resultposition: number | null
          resulttime: number | null
          resulttimediff: number | null
          xmlpersonname: string | null
        }
        Insert: {
          batchid?: string | null
          classresultnumberofstarts?: number | null
          classtypeid?: number | null
          clubparticipation?: number | null
          countnopoints?: number | null
          eventclassname?: string | null
          eventid?: number | null
          eventraceid: number
          id?: number
          klassfaktor?: number | null
          personage?: number | null
          personid: number
          points?: number | null
          readonly?: number | null
          relayleg?: number | null
          relaylegoverallposition?: number | null
          relayteamenddiff?: number | null
          relayteamendposition?: number | null
          relayteamendstatus?: string | null
          relayteamname?: string | null
          resultcompetitorstatus?: string | null
          resultposition?: number | null
          resulttime?: number | null
          resulttimediff?: number | null
          xmlpersonname?: string | null
        }
        Update: {
          batchid?: string | null
          classresultnumberofstarts?: number | null
          classtypeid?: number | null
          clubparticipation?: number | null
          countnopoints?: number | null
          eventclassname?: string | null
          eventid?: number | null
          eventraceid?: number
          id?: number
          klassfaktor?: number | null
          personage?: number | null
          personid?: number
          points?: number | null
          readonly?: number | null
          relayleg?: number | null
          relaylegoverallposition?: number | null
          relayteamenddiff?: number | null
          relayteamendposition?: number | null
          relayteamendstatus?: string | null
          relayteamname?: string | null
          resultcompetitorstatus?: string | null
          resultposition?: number | null
          resulttime?: number | null
          resulttimediff?: number | null
          xmlpersonname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_results_batchrun"
            columns: ["batchid"]
            isOneToOne: false
            referencedRelation: "batchrun"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_results_event_race"
            columns: ["eventraceid"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["eventraceid"]
          },
          {
            foreignKeyName: "fk_results_eventrace"
            columns: ["eventraceid"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["eventraceid"]
          },
          {
            foreignKeyName: "fk_results_org"
            columns: ["clubparticipation"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["organisationid"]
          },
          {
            foreignKeyName: "fk_results_organisation"
            columns: ["clubparticipation"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["organisationid"]
          },
        ]
      }
      warnings: {
        Row: {
          batchid: string | null
          clubparticipation: number | null
          created: string | null
          eventid: number | null
          eventraceid: number | null
          hide: number | null
          id: string
          message: string | null
          organisationid: number | null
          personid: number | null
        }
        Insert: {
          batchid?: string | null
          clubparticipation?: number | null
          created?: string | null
          eventid?: number | null
          eventraceid?: number | null
          hide?: number | null
          id?: string
          message?: string | null
          organisationid?: number | null
          personid?: number | null
        }
        Update: {
          batchid?: string | null
          clubparticipation?: number | null
          created?: string | null
          eventid?: number | null
          eventraceid?: number | null
          hide?: number | null
          id?: string
          message?: string | null
          organisationid?: number | null
          personid?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      results_index461: {
        Row: {
          batchid: string | null
          classresultnumberofstarts: number | null
          classtypeid: number | null
          clubparticipation: number | null
          competitionid: number | null
          disciplineid: number | null
          eventclassname: string | null
          eventdate: string | null
          eventdistance: string | null
          eventdistance_label: string | null
          eventform: string | null
          eventform_group: string | null
          eventform_label: string | null
          eventid: number | null
          eventname: string | null
          eventraceid: number | null
          eventsid: number | null
          eventyear: number | null
          id: number | null
          klassfaktor: number | null
          person_organisationid: number | null
          personage: number | null
          personid: number | null
          personnamefamily: string | null
          personnamegiven: string | null
          personsex: string | null
          points: number | null
          readonly: number | null
          relayleg: number | null
          relaylegoverallposition: number | null
          relayteamenddiff: number | null
          relayteamendposition: number | null
          relayteamendstatus: string | null
          relayteamname: string | null
          resultcompetitorstatus: string | null
          resultposition: number | null
          resulttime: number | null
          resulttimediff: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_results_batchrun"
            columns: ["batchid"]
            isOneToOne: false
            referencedRelation: "batchrun"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_results_event_race"
            columns: ["eventraceid"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["eventraceid"]
          },
          {
            foreignKeyName: "fk_results_eventrace"
            columns: ["eventraceid"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["eventraceid"]
          },
          {
            foreignKeyName: "fk_results_org"
            columns: ["clubparticipation"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["organisationid"]
          },
          {
            foreignKeyName: "fk_results_organisation"
            columns: ["clubparticipation"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["organisationid"]
          },
        ]
      }
    }
    Functions: {
      _normalize_gender: {
        Args: { _g: string }
        Returns: string
      }
      get_results_filtered_v2: {
        Args: {
          _age_max: number
          _age_min: number
          _club: number
          _discipline_id: number
          _gender: string
          _limit?: number
          _offset?: number
          _only_championship: boolean
          _year: number
        }
        Returns: {
          classresultnumberofstarts: number
          classtypeid: number
          clubparticipation: number
          eventclassificationid: number
          eventclassname: string
          eventdate: string
          eventdistance: string
          eventform: string
          eventid: number
          eventname: string
          eventraceid: number
          klassfaktor: number
          personage: number
          personid: number
          personnamefamily: string
          personnamegiven: string
          personsex: string
          points: number
          relayleg: number
          relaylegoverallposition: number
          relayteamenddiff: number
          relayteamendposition: number
          relayteamname: string
          resultcompetitorstatus: string
          resultposition: number
          resulttime: number
          resulttimediff: number
        }[]
      }
      rpc_apptexts_get_many: {
        Args: { _keys: string[]; _page: string }
        Returns: {
          key: string
          value: string
        }[]
      }
      rpc_batchrun_recent: {
        Args: { _limit?: number }
        Returns: {
          appversion: string
          clubparticipation: number
          comment: string
          endtime: string
          id: string
          initiatedby: string
          numberoferrors: number
          numberofrequests: number
          numberofrowsafter: number
          numberofrowsbefore: number
          renderjobid: string
          starttime: string
          status: string
        }[]
      }
      rpc_club_name: {
        Args: { _club: number }
        Returns: {
          clubname: string
          organisationid: number
        }[]
      }
      rpc_index461: {
        Args: {
          discipline_ids?: number[]
          distances?: string[]
          form_groups?: string[]
          genders?: string[]
          limit_rows?: number
          offset_rows?: number
          years?: number[]
        }
        Returns: {
          batchid: string | null
          classresultnumberofstarts: number | null
          classtypeid: number | null
          clubparticipation: number | null
          competitionid: number | null
          disciplineid: number | null
          eventclassname: string | null
          eventdate: string | null
          eventdistance: string | null
          eventdistance_label: string | null
          eventform: string | null
          eventform_group: string | null
          eventform_label: string | null
          eventid: number | null
          eventname: string | null
          eventraceid: number | null
          eventsid: number | null
          eventyear: number | null
          id: number | null
          klassfaktor: number | null
          person_organisationid: number | null
          personage: number | null
          personid: number | null
          personnamefamily: string | null
          personnamegiven: string | null
          personsex: string | null
          points: number | null
          readonly: number | null
          relayleg: number | null
          relaylegoverallposition: number | null
          relayteamenddiff: number | null
          relayteamendposition: number | null
          relayteamendstatus: string | null
          relayteamname: string | null
          resultcompetitorstatus: string | null
          resultposition: number | null
          resulttime: number | null
          resulttimediff: number | null
        }[]
      }
      rpc_index461_stats: {
        Args: {
          discipline_ids?: number[]
          distances?: string[]
          form_groups?: string[]
          genders?: string[]
          year: number
        }
        Returns: {
          competitions_with_participation: number
          participants_with_start: number
          runs_didnotstart: number
          runs_mispunch: number
          runs_ok: number
          runs_other: number
        }[]
      }
      rpc_index461_top_competitors: {
        Args: {
          discipline_ids?: number[]
          distances?: string[]
          form_groups?: string[]
          genders?: string[]
          limit_rows?: number
          year: number
        }
        Returns: {
          competitions_count: number
          personid: number
          personnamefamily: string
          personnamegiven: string
        }[]
      }
      rpc_logdata_recent: {
        Args: { _limit?: number }
        Returns: {
          comment: string
          completed: string
          errormessage: string
          eventid: number
          level: string
          organisationid: number
          request: string
          responsecode: string
          started: string
        }[]
      }
      rpc_results_enriched: {
        Args: {
          _age_max?: number
          _age_min?: number
          _club?: number
          _gender?: string
          _limit?: number
          _offset?: number
          _only_championship?: boolean
          _personid?: number
          _year?: number
        }
        Returns: {
          classresultnumberofstarts: number
          classtypeid: number
          clubparticipation: number
          eventclassificationid: number
          eventclassname: string
          eventdate: string
          eventdistance: string
          eventform: string
          eventid: number
          eventname: string
          eventraceid: number
          klassfaktor: number
          personage: number
          personid: number
          personnamefamily: string
          personnamegiven: string
          personsex: string
          points: number
          relayleg: number
          relaylegoverallposition: number
          relayteamenddiff: number
          relayteamendposition: number
          relayteamname: string
          resultcompetitorstatus: string
          resultposition: number
          resulttime: number
          resulttimediff: number
        }[]
      }
      rpc_years_for_club: {
        Args: { _club: number }
        Returns: {
          year: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
